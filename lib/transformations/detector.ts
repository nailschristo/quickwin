import Fuse, { FuseResult } from 'fuse.js'
import { TransformationConfig } from '@/types/transformations'
import { nameTransformations, addressTransformations, phoneTransformations } from './common'

export type DetectedTransformation = {
  type: 'split' | 'combine' | 'format' | 'bidirectional'
  sourceColumns: string[]
  targetColumns: string[]
  confidence: number
  description: string
  config: TransformationConfig | null
  reverseConfig?: TransformationConfig | null
}

/**
 * Detect potential transformations between source and target columns
 */
export class TransformationDetector {
  private sourceFuse: Fuse<{ name: string; index: number }>
  private targetFuse: Fuse<{ name: string; index: number }>
  
  constructor(
    private sourceColumns: string[],
    private targetColumns: string[]
  ) {
    // Set up fuzzy search for column matching
    const fuseOptions = {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true
    }
    
    this.sourceFuse = new Fuse(
      sourceColumns.map((name, index) => ({ name, index })),
      fuseOptions
    )
    
    this.targetFuse = new Fuse(
      targetColumns.map((name, index) => ({ name, index })),
      fuseOptions
    )
  }
  
  /**
   * Detect all possible transformations
   */
  detectTransformations(): DetectedTransformation[] {
    const transformations: DetectedTransformation[] = []
    
    // Check for name transformations
    transformations.push(...this.detectNameTransformations())
    
    // Check for address transformations
    transformations.push(...this.detectAddressTransformations())
    
    // Check for phone transformations
    transformations.push(...this.detectPhoneTransformations())
    
    // Check for date/time transformations
    transformations.push(...this.detectDateTimeTransformations())
    
    return transformations
  }
  
  /**
   * Detect name-related transformations
   */
  private detectNameTransformations(): DetectedTransformation[] {
    const transformations: DetectedTransformation[] = []
    
    // Pattern 1: Full Name -> First Name + Last Name (split)
    const fullNameColumns = this.findColumns(this.sourceColumns, ['name', 'full name', 'fullname', 'customer name', 'person name'])
    const firstNameColumns = this.findColumns(this.targetColumns, ['first name', 'firstname', 'given name', 'givenname'])
    const lastNameColumns = this.findColumns(this.targetColumns, ['last name', 'lastname', 'surname', 'family name'])
    
    if (fullNameColumns.length > 0 && firstNameColumns.length > 0 && lastNameColumns.length > 0) {
      transformations.push({
        type: 'split',
        sourceColumns: [fullNameColumns[0].item.name],
        targetColumns: [firstNameColumns[0].item.name, lastNameColumns[0].item.name],
        confidence: Math.min(1 - (fullNameColumns[0].score || 0), 1 - (firstNameColumns[0].score || 0), 1 - (lastNameColumns[0].score || 0)),
        description: `Split "${fullNameColumns[0].item.name}" into first and last names`,
        config: nameTransformations.splitFullName(firstNameColumns[0].item.name, lastNameColumns[0].item.name)
      })
    }
    
    // Pattern 2: First Name + Last Name -> Full Name (combine)
    const sourceFirstNames = this.findColumns(this.sourceColumns, ['first name', 'firstname', 'given name'])
    const sourceLastNames = this.findColumns(this.sourceColumns, ['last name', 'lastname', 'surname'])
    const targetFullNames = this.findColumns(this.targetColumns, ['name', 'full name', 'fullname', 'customer name'])
    
    if (sourceFirstNames.length > 0 && sourceLastNames.length > 0 && targetFullNames.length > 0) {
      transformations.push({
        type: 'combine',
        sourceColumns: [sourceFirstNames[0].item.name, sourceLastNames[0].item.name],
        targetColumns: [targetFullNames[0].item.name],
        confidence: Math.min(1 - (sourceFirstNames[0].score || 0), 1 - (sourceLastNames[0].score || 0), 1 - (targetFullNames[0].score || 0)),
        description: `Combine first and last names into "${targetFullNames[0].item.name}"`,
        config: {
          type: 'combine',
          config: {
            separator: ' ',
            skipEmpty: true,
            trim: true
          }
        }
      })
    }
    
    // Pattern 3: Middle name handling
    const middleNameColumns = this.findColumns(this.targetColumns, ['middle name', 'middlename', 'middle initial'])
    if (fullNameColumns.length > 0 && firstNameColumns.length > 0 && middleNameColumns.length > 0 && lastNameColumns.length > 0) {
      transformations.push({
        type: 'split',
        sourceColumns: [fullNameColumns[0].item.name],
        targetColumns: [firstNameColumns[0].item.name, middleNameColumns[0].item.name, lastNameColumns[0].item.name],
        confidence: 0.85,
        description: `Split "${fullNameColumns[0].item.name}" into first, middle, and last names`,
        config: {
          type: 'custom',
          config: {
            handler: 'splitFullNameWithMiddle'
          }
        }
      })
    }
    
    return transformations
  }
  
  /**
   * Detect address-related transformations
   */
  private detectAddressTransformations(): DetectedTransformation[] {
    const transformations: DetectedTransformation[] = []
    
    // Pattern: Full Address -> Street + City + State + Zip
    const fullAddressColumns = this.findColumns(this.sourceColumns, ['address', 'full address', 'complete address', 'location'])
    const streetColumns = this.findColumns(this.targetColumns, ['street', 'street address', 'address1', 'address line 1'])
    const cityColumns = this.findColumns(this.targetColumns, ['city', 'town', 'municipality'])
    const stateColumns = this.findColumns(this.targetColumns, ['state', 'province', 'region'])
    const zipColumns = this.findColumns(this.targetColumns, ['zip', 'zipcode', 'zip code', 'postal code', 'postcode'])
    
    if (fullAddressColumns.length > 0 && streetColumns.length > 0 && cityColumns.length > 0) {
      const targetCols = [streetColumns[0].item.name, cityColumns[0].item.name]
      if (stateColumns.length > 0) targetCols.push(stateColumns[0].item.name)
      if (zipColumns.length > 0) targetCols.push(zipColumns[0].item.name)
      
      transformations.push({
        type: 'split',
        sourceColumns: [fullAddressColumns[0].item.name],
        targetColumns: targetCols,
        confidence: 0.8,
        description: `Split "${fullAddressColumns[0].item.name}" into address components`,
        config: {
          type: 'custom',
          config: {
            handler: 'splitAddress'
          }
        }
      })
    }
    
    return transformations
  }
  
  /**
   * Detect phone-related transformations
   */
  private detectPhoneTransformations(): DetectedTransformation[] {
    const transformations: DetectedTransformation[] = []
    
    const phoneColumns = this.findColumns(this.sourceColumns, ['phone', 'phone number', 'telephone', 'mobile', 'cell'])
    const targetPhoneColumns = this.findColumns(this.targetColumns, ['phone', 'phone number', 'telephone', 'mobile', 'cell'])
    
    if (phoneColumns.length > 0 && targetPhoneColumns.length > 0) {
      transformations.push({
        type: 'format',
        sourceColumns: [phoneColumns[0].item.name],
        targetColumns: [targetPhoneColumns[0].item.name],
        confidence: 0.9,
        description: `Format phone number`,
        config: phoneTransformations.formatPhoneUS()
      })
    }
    
    return transformations
  }
  
  /**
   * Detect date/time-related transformations
   */
  private detectDateTimeTransformations(): DetectedTransformation[] {
    const transformations: DetectedTransformation[] = []
    
    // Pattern: Date + Time -> DateTime
    const dateColumns = this.findColumns(this.sourceColumns, ['date', 'event date', 'start date'])
    const timeColumns = this.findColumns(this.sourceColumns, ['time', 'event time', 'start time'])
    const dateTimeColumns = this.findColumns(this.targetColumns, ['datetime', 'date time', 'timestamp'])
    
    if (dateColumns.length > 0 && timeColumns.length > 0 && dateTimeColumns.length > 0) {
      transformations.push({
        type: 'combine',
        sourceColumns: [dateColumns[0].item.name, timeColumns[0].item.name],
        targetColumns: [dateTimeColumns[0].item.name],
        confidence: 0.85,
        description: `Combine date and time into "${dateTimeColumns[0].item.name}"`,
        config: {
          type: 'combine',
          config: {
            separator: ' ',
            skipEmpty: false,
            trim: true
          }
        }
      })
    }
    
    return transformations
  }
  
  /**
   * Find columns that match any of the given patterns
   */
  private findColumns(columns: string[], patterns: string[]): FuseResult<{ name: string; index: number }>[] {
    const results: FuseResult<{ name: string; index: number }>[] = []
    const fuse = columns === this.sourceColumns ? this.sourceFuse : this.targetFuse
    
    for (const pattern of patterns) {
      const matches = fuse.search(pattern)
      if (matches.length > 0) {
        // Only add if not already in results
        const existingIndex = results.findIndex(r => r.item.index === matches[0].item.index)
        if (existingIndex === -1) {
          results.push(matches[0])
        }
      }
    }
    
    return results
  }
}