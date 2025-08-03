import {
  TransformationType,
  TransformationConfig,
  SplitConfig,
  CombineConfig,
  FormatConfig,
  ExtractConfig,
  ConditionalConfig
} from '@/types/transformations'

export class TransformationEngine {
  /**
   * Apply a transformation to source data
   */
  static async transform(
    sourceData: Record<string, any>,
    sourceColumns: string[],
    config: TransformationConfig
  ): Promise<Record<string, any>> {
    switch (config.type) {
      case 'split':
        return this.splitTransform(sourceData, sourceColumns[0], config.config)
      case 'combine':
        return this.combineTransform(sourceData, sourceColumns, config.config)
      case 'format':
        return this.formatTransform(sourceData, sourceColumns[0], config.config)
      case 'extract':
        return this.extractTransform(sourceData, sourceColumns[0], config.config)
      case 'conditional':
        return this.conditionalTransform(sourceData, sourceColumns, config.config)
      case 'custom':
        return this.customTransform(sourceData, sourceColumns, config.config)
      default:
        const exhaustiveCheck: never = config
        throw new Error(`Unknown transformation type: ${(exhaustiveCheck as any).type}`)
    }
  }

  /**
   * Split transformation - splits a single value into multiple parts
   */
  private static splitTransform(
    sourceData: Record<string, any>,
    sourceColumn: string,
    config: SplitConfig
  ): Record<string, any> {
    const value = sourceData[sourceColumn]
    if (!value || typeof value !== 'string') {
      // Return default values if configured
      const result: Record<string, any> = {}
      config.parts.forEach(part => {
        result[part.targetColumn] = part.defaultValue || ''
      })
      return result
    }

    const parts = value.split(config.delimiter)
    const result: Record<string, any> = {}

    config.parts.forEach(part => {
      let partValue = parts[part.index] || part.defaultValue || ''
      if (config.trim) {
        partValue = partValue.trim()
      }
      if (!config.keepEmpty && !partValue) {
        partValue = part.defaultValue || ''
      }
      result[part.targetColumn] = partValue
    })

    return result
  }

  /**
   * Combine transformation - combines multiple values into one
   */
  private static combineTransform(
    sourceData: Record<string, any>,
    sourceColumns: string[],
    config: CombineConfig
  ): Record<string, any> {
    const values = sourceColumns
      .map(col => sourceData[col])
      .filter(val => config.skipEmpty ? val : true)
      .map(val => config.trim && typeof val === 'string' ? val.trim() : val)

    let combined = values.join(config.separator)
    
    if (config.prefix) combined = config.prefix + combined
    if (config.suffix) combined = combined + config.suffix

    return { combined }
  }

  /**
   * Format transformation - formats a value according to rules
   */
  private static formatTransform(
    sourceData: Record<string, any>,
    sourceColumn: string,
    config: FormatConfig
  ): Record<string, any> {
    const value = sourceData[sourceColumn]
    if (!value) return { formatted: '' }

    let formatted: string
    const strValue = String(value)

    switch (config.operation) {
      case 'uppercase':
        formatted = strValue.toUpperCase()
        break
      case 'lowercase':
        formatted = strValue.toLowerCase()
        break
      case 'capitalize':
        formatted = strValue.charAt(0).toUpperCase() + strValue.slice(1).toLowerCase()
        break
      case 'phone':
        formatted = this.formatPhone(strValue, config.toFormat)
        break
      case 'date':
        formatted = this.formatDate(strValue, config.fromFormat, config.toFormat)
        break
      case 'number':
        formatted = this.formatNumber(strValue, config.toFormat, config.locale)
        break
      case 'custom':
        formatted = this.applyCustomFormat(strValue, config.customPattern || '')
        break
      default:
        formatted = strValue
    }

    return { formatted }
  }

  /**
   * Extract transformation - extracts part of a value
   */
  private static extractTransform(
    sourceData: Record<string, any>,
    sourceColumn: string,
    config: ExtractConfig
  ): Record<string, any> {
    const value = sourceData[sourceColumn]
    if (!value) return { extracted: '' }

    const strValue = String(value)
    let extracted: string = ''

    switch (config.extractType) {
      case 'regex':
        if (config.pattern) {
          const match = strValue.match(new RegExp(config.pattern))
          extracted = match ? match[config.groupIndex || 0] : ''
        }
        break
      case 'before':
        if (config.pattern) {
          const index = strValue.indexOf(config.pattern)
          extracted = index > -1 ? strValue.substring(0, index) : strValue
        }
        break
      case 'after':
        if (config.pattern) {
          const index = strValue.indexOf(config.pattern)
          extracted = index > -1 ? strValue.substring(index + config.pattern.length) : ''
        }
        break
      case 'between':
        if (config.startPattern && config.endPattern) {
          const startIndex = strValue.indexOf(config.startPattern)
          const endIndex = strValue.indexOf(config.endPattern, startIndex + config.startPattern.length)
          if (startIndex > -1 && endIndex > -1) {
            extracted = strValue.substring(startIndex + config.startPattern.length, endIndex)
          }
        }
        break
      case 'email_domain':
        const emailMatch = strValue.match(/@(.+)/)
        extracted = emailMatch ? emailMatch[1] : ''
        break
      case 'date_part':
        extracted = this.extractDatePart(strValue, config.datePart || 'year')
        break
    }

    return { extracted }
  }

  /**
   * Conditional transformation - applies transformations based on conditions
   */
  private static conditionalTransform(
    sourceData: Record<string, any>,
    sourceColumns: string[],
    config: ConditionalConfig
  ): Record<string, any> {
    for (const condition of config.conditions) {
      if (this.evaluateCondition(sourceData, condition.if)) {
        return this.applyAction(sourceData, condition.then)
      }
    }

    // Apply else clause if no conditions matched
    if (config.else) {
      return this.applyAction(sourceData, config.else)
    }

    return {}
  }

  /**
   * Custom transformation - for user-defined transformations
   */
  private static customTransform(
    sourceData: Record<string, any>,
    sourceColumns: string[],
    config: any
  ): Record<string, any> {
    // This would be extended to support custom JavaScript functions
    // For now, just return empty
    return {}
  }

  // Helper methods

  private static formatPhone(phone: string, format?: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (!format || format === 'clean') return cleaned
    
    // Handle US phone format
    if (cleaned.length === 10) {
      if (format === '(XXX) XXX-XXXX') {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      }
      if (format === 'XXX-XXX-XXXX') {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      }
    }
    
    return cleaned
  }

  private static formatDate(date: string, fromFormat?: string, toFormat?: string): string {
    // Simple date formatting - in production, use a library like date-fns
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return date
      
      if (toFormat === 'YYYY-MM-DD') {
        return dateObj.toISOString().split('T')[0]
      }
      if (toFormat === 'MM/DD/YYYY') {
        return `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`
      }
      
      return dateObj.toLocaleDateString()
    } catch {
      return date
    }
  }

  private static formatNumber(num: string, format?: string, locale?: string): string {
    const parsed = parseFloat(num)
    if (isNaN(parsed)) return num
    
    if (format === 'currency') {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(parsed)
    }
    
    if (format === 'percent') {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'percent',
        minimumFractionDigits: 2
      }).format(parsed / 100)
    }
    
    return parsed.toLocaleString(locale || 'en-US')
  }

  private static applyCustomFormat(value: string, pattern: string): string {
    // Simple pattern replacement
    // In production, this would be more sophisticated
    return pattern.replace(/X/g, () => value.length > 0 ? value.charAt(0) : '')
  }

  private static extractDatePart(date: string, part: string): string {
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return ''
      
      switch (part) {
        case 'year': return String(dateObj.getFullYear())
        case 'month': return String(dateObj.getMonth() + 1).padStart(2, '0')
        case 'day': return String(dateObj.getDate()).padStart(2, '0')
        case 'hour': return String(dateObj.getHours()).padStart(2, '0')
        case 'minute': return String(dateObj.getMinutes()).padStart(2, '0')
        default: return ''
      }
    } catch {
      return ''
    }
  }

  private static evaluateCondition(
    data: Record<string, any>,
    condition: ConditionalConfig['conditions'][0]['if']
  ): boolean {
    const value = data[condition.column]
    const strValue = value ? String(value) : ''
    const compareValue = condition.value || ''

    switch (condition.operator) {
      case 'equals': return strValue === compareValue
      case 'not_equals': return strValue !== compareValue
      case 'contains': return strValue.includes(compareValue)
      case 'starts_with': return strValue.startsWith(compareValue)
      case 'ends_with': return strValue.endsWith(compareValue)
      case 'is_empty': return !value || strValue.trim() === ''
      case 'is_not_empty': return !!value && strValue.trim() !== ''
      default: return false
    }
  }

  private static applyAction(
    data: Record<string, any>,
    action: ConditionalConfig['conditions'][0]['then'] | NonNullable<ConditionalConfig['else']>
  ): Record<string, any> {
    switch (action.action) {
      case 'set_value':
        return { result: action.value || '' }
      case 'copy_from':
        return { result: data[action.sourceColumn || ''] || '' }
      case 'keep_original':
        return { result: data[Object.keys(data)[0]] || '' }
      default:
        return { result: '' }
    }
  }
}