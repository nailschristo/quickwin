import { TransformationConfig, SplitConfig } from '@/types/transformations'

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
 * Apply smart name splitting with multiple strategies
 */
export function smartNameSplit(fullName: string): { firstName: string; lastName: string } {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' }
  }

  const trimmed = fullName.trim()
  
  // Check for comma-separated format (Last, First)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim())
    return {
      firstName: parts[1] || '',
      lastName: parts[0] || ''
    }
  }
  
  // Split by space
  const parts = trimmed.split(/\s+/)
  
  if (parts.length === 1) {
    // Only one name part - put it as first name
    return { firstName: parts[0], lastName: '' }
  }
  
  if (parts.length === 2) {
    // Simple first last
    return { firstName: parts[0], lastName: parts[1] }
  }
  
  // Multiple parts - assume first part is first name, rest is last name
  // This handles "John Michael Doe" -> "John" "Michael Doe"
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}