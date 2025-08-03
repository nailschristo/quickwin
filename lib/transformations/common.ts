import { TransformationConfig, SplitConfig } from '@/types/transformations'
const human = require('humanparser')

/**
 * Common transformation configurations that can be reused
 */

export const nameTransformations = {
  /**
   * Split a full name into first and last name
   * Handles: "John Doe", "John Michael Doe", "Doe, John"
   */
  splitFullName: (firstNameColumn: string, lastNameColumn: string): TransformationConfig => ({
    type: 'split',
    config: {
      delimiter: ' ',
      trim: true,
      parts: [
        {
          index: 0,
          targetColumn: firstNameColumn,
          defaultValue: ''
        },
        {
          index: -1, // Special handling: -1 means last element
          targetColumn: lastNameColumn,
          defaultValue: ''
        }
      ]
    } as SplitConfig
  }),

  /**
   * Split name with comma (Last, First format)
   */
  splitLastFirstName: (firstNameColumn: string, lastNameColumn: string): TransformationConfig => ({
    type: 'split',
    config: {
      delimiter: ',',
      trim: true,
      parts: [
        {
          index: 1, // First name is after comma
          targetColumn: firstNameColumn,
          defaultValue: ''
        },
        {
          index: 0, // Last name is before comma
          targetColumn: lastNameColumn,
          defaultValue: ''
        }
      ]
    } as SplitConfig
  }),

  /**
   * Combine first and last name into full name
   */
  combineFirstLast: (fullNameColumn: string): TransformationConfig => ({
    type: 'combine',
    config: {
      separator: ' ',
      skipEmpty: true,
      trim: true
    }
  })
}

export const addressTransformations = {
  /**
   * Split full address into components
   * Example: "123 Main St, New York, NY 10001"
   */
  splitFullAddress: (): TransformationConfig => ({
    type: 'split',
    config: {
      delimiter: ',',
      trim: true,
      parts: [
        {
          index: 0,
          targetColumn: 'Street Address',
          defaultValue: ''
        },
        {
          index: 1,
          targetColumn: 'City',
          defaultValue: ''
        },
        {
          index: 2,
          targetColumn: 'State/Zip',
          defaultValue: ''
        }
      ]
    } as SplitConfig
  }),

  /**
   * Extract zip code from address
   */
  extractZipCode: (): TransformationConfig => ({
    type: 'extract',
    config: {
      extractType: 'regex',
      pattern: '\\b\\d{5}(?:-\\d{4})?\\b',
      groupIndex: 0
    }
  })
}

export const dateTimeTransformations = {
  /**
   * Combine date and time columns
   */
  combineDatetime: (): TransformationConfig => ({
    type: 'combine',
    config: {
      separator: ' ',
      skipEmpty: false,
      trim: true
    }
  }),

  /**
   * Extract year from date
   */
  extractYear: (): TransformationConfig => ({
    type: 'extract',
    config: {
      extractType: 'date_part',
      datePart: 'year'
    }
  })
}

export const phoneTransformations = {
  /**
   * Clean phone number to digits only
   */
  cleanPhone: (): TransformationConfig => ({
    type: 'format',
    config: {
      operation: 'phone',
      toFormat: 'clean'
    }
  }),

  /**
   * Format phone as (XXX) XXX-XXXX
   */
  formatPhoneUS: (): TransformationConfig => ({
    type: 'format',
    config: {
      operation: 'phone',
      toFormat: '(XXX) XXX-XXXX'
    }
  })
}

/**
 * Helper to detect the best transformation for a column mapping
 */
export function suggestTransformation(
  sourceColumn: string,
  targetColumns: string[]
): TransformationConfig | null {
  const sourceLower = sourceColumn.toLowerCase()
  
  // Name splitting detection
  if (sourceLower === 'name' || sourceLower === 'full name' || sourceLower === 'fullname') {
    const hasFirstName = targetColumns.some(t => t.toLowerCase().includes('first'))
    const hasLastName = targetColumns.some(t => t.toLowerCase().includes('last'))
    
    if (hasFirstName && hasLastName) {
      const firstName = targetColumns.find(t => t.toLowerCase().includes('first')) || 'First Name'
      const lastName = targetColumns.find(t => t.toLowerCase().includes('last')) || 'Last Name'
      return nameTransformations.splitFullName(firstName, lastName)
    }
  }
  
  // Address splitting detection
  if (sourceLower.includes('address') && targetColumns.length > 1) {
    return addressTransformations.splitFullAddress()
  }
  
  // Phone formatting detection
  if (sourceLower.includes('phone')) {
    return phoneTransformations.cleanPhone()
  }
  
  return null
}

/**
 * Apply smart name splitting using humanparser library
 */
export function smartNameSplit(fullName: string): { firstName: string; lastName: string } {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' }
  }

  // Use humanparser for more intelligent parsing
  const parsed = human.parseName(fullName.trim())
  
  return {
    firstName: [parsed.salutation, parsed.firstName, parsed.middleName]
      .filter(Boolean)
      .join(' ')
      .trim() || parsed.firstName || '',
    lastName: [parsed.lastName, parsed.suffix]
      .filter(Boolean)
      .join(' ')
      .trim() || parsed.lastName || ''
  }
}

/**
 * Parse a full name into all its components
 */
export function parseFullName(fullName: string) {
  if (!fullName || typeof fullName !== 'string') {
    return {
      salutation: '',
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      fullName: ''
    }
  }
  
  const parsed = human.parseName(fullName.trim())
  return {
    ...parsed,
    fullName: fullName.trim()
  }
}

/**
 * Combine name parts into a full name
 */
export function combineNameParts(parts: {
  salutation?: string
  firstName?: string
  middleName?: string
  lastName?: string
  suffix?: string
}): string {
  return [
    parts.salutation,
    parts.firstName,
    parts.middleName,
    parts.lastName,
    parts.suffix
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}