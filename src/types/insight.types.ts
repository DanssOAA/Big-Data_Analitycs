export type ComparisonMode =
  | 'crm'
  | 'datasets'

export interface ComparisonRow {
  indicador: string
  mio: string
  externo: string
}

export interface AiAnalysisResult {
  title: string
  gap: string
  probableCause: string
  recommendations: string[]
  comparison: ComparisonRow[]
  improvementPlan: string[]
  competitorAdvantage: string
  conclusion: string
}

export interface InsightRecord
  extends AiAnalysisResult {
  id: string
  datasetId: string | null
  tableId: string | null
  comparedDatasetId: string | null
  comparisonMode: ComparisonMode
  crmSnapshot: unknown
  externalSnapshot: unknown
  published: boolean
  createdBy: string | null
  createdAt: string
  publishedAt: string | null
}
