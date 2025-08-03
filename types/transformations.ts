export type TransformationType = 'split' | 'combine' | 'format' | 'extract' | 'conditional' | 'custom'

export interface BaseTransformation {
  id?: string
  jobId: string
  name: string
  transformationType: TransformationType
  sourceColumns: string[]
  targetColumns: string[]
  executionOrder?: number
  createdAt?: string
  updatedAt?: string
}

// Split transformation config
export interface SplitConfig {
  delimiter: string
  keepEmpty?: boolean
  trim?: boolean
  parts: Array<{
    index: number
    targetColumn: string
    defaultValue?: string
  }>
}

// Combine transformation config
export interface CombineConfig {
  separator: string
  skipEmpty?: boolean
  trim?: boolean
  prefix?: string
  suffix?: string
}

// Format transformation config
export interface FormatConfig {
  operation: 'uppercase' | 'lowercase' | 'capitalize' | 'phone' | 'date' | 'number' | 'custom'
  customPattern?: string
  fromFormat?: string
  toFormat?: string
  locale?: string
}

// Extract transformation config
export interface ExtractConfig {
  extractType: 'regex' | 'before' | 'after' | 'between' | 'email_domain' | 'date_part'
  pattern?: string
  startPattern?: string
  endPattern?: string
  datePart?: 'year' | 'month' | 'day' | 'hour' | 'minute'
  groupIndex?: number
}

// Conditional transformation config
export interface ConditionalConfig {
  conditions: Array<{
    if: {
      column: string
      operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty'
      value?: string
    }
    then: {
      action: 'set_value' | 'copy_from' | 'transform'
      value?: string
      sourceColumn?: string
      transformation?: TransformationType
      transformConfig?: any
    }
  }>
  else?: {
    action: 'set_value' | 'copy_from' | 'keep_original'
    value?: string
    sourceColumn?: string
  }
}

export type TransformationConfig = 
  | { type: 'split'; config: SplitConfig }
  | { type: 'combine'; config: CombineConfig }
  | { type: 'format'; config: FormatConfig }
  | { type: 'extract'; config: ExtractConfig }
  | { type: 'conditional'; config: ConditionalConfig }
  | { type: 'custom'; config: any }

export interface ColumnTransformation extends BaseTransformation {
  configuration: TransformationConfig
}

// Helper type for column mappings with transformations
export interface EnhancedColumnMapping {
  id?: string
  jobId: string
  fileId: string
  sourceColumn: string
  targetColumn: string
  confidence: number
  mappingType: 'exact' | 'fuzzy' | 'ai' | 'manual'
  transformationConfig?: TransformationConfig
  isMultiSource?: boolean
  isMultiTarget?: boolean
}