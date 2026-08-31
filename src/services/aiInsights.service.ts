import { toError } from './errors'

import { supabase } from './supabaseClient'

import type { CrmMetricsSnapshot } from './crmMetrics.service'

import type {
  ColumnSummary,
  ProductBreakdownItem,
} from './datasetSummary.service'

import type {
  AiAnalysisResult,
  ComparisonMode,
  InsightRecord,
} from '../types/insight.types'

const GEMINI_MODEL = 'gemini-2.0-flash'

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  },
)

const RESPONSE_SCHEMA_HINT = `Responde EXCLUSIVAMENTE con un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "title": "titulo corto del analisis",
  "gap": "descripcion breve de la brecha detectada",
  "probableCause": "causa probable de la brecha",
  "recommendations": ["recomendacion 1", "recomendacion 2"],
  "comparison": [{"indicador": "nombre del indicador", "mio": "valor propio", "externo": "valor comparado"}],
  "improvementPlan": ["paso 1 del plan de mejora", "paso 2"],
  "competitorAdvantage": "que esta haciendo mejor la competencia y como aprovecharlo para nosotros",
  "conclusion": "conclusion estrategica"
}`

function extractJson(text: string) {
  const trimmed = text.trim()

  const fenced = trimmed.match(
    /```(?:json)?\s*([\s\S]*?)```/i,
  )

  const candidate = fenced
    ? fenced[1]
    : trimmed

  return JSON.parse(candidate)
}

async function callGemini(
  prompt: string,
): Promise<AiAnalysisResult> {
  const apiKey = import.meta.env
    .VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error(
      'Falta VITE_GEMINI_API_KEY en el archivo .env.',
    )
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType:
            'application/json',
        },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => '')

    throw new Error(
      `Gemini respondio con un error (${response.status}). ${errorBody}`.trim(),
    )
  }

  const payload =
    await response.json()

  const text =
    payload?.candidates?.[0]
      ?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error(
      'La IA no devolvio contenido para analizar.',
    )
  }

  try {
    const parsed = extractJson(text)

    return {
      title:
        parsed.title ??
        'Analisis comparativo',
      gap: parsed.gap ?? '',
      probableCause:
        parsed.probableCause ?? '',
      recommendations: Array.isArray(
        parsed.recommendations,
      )
        ? parsed.recommendations
        : [],
      comparison: Array.isArray(
        parsed.comparison,
      )
        ? parsed.comparison
        : [],
      improvementPlan: Array.isArray(
        parsed.improvementPlan,
      )
        ? parsed.improvementPlan
        : [],
      competitorAdvantage:
        parsed.competitorAdvantage ??
        '',
      conclusion:
        parsed.conclusion ?? '',
    }
  } catch {
    throw new Error(
      'La IA devolvio una respuesta que no se pudo interpretar como JSON.',
    )
  }
}

function formatCrmSnapshot(
  crmSnapshot: CrmMetricsSnapshot,
) {
  return `Ventas ultimos 30 dias: ${money.format(crmSnapshot.totalSales30Days)}
Ticket promedio: ${money.format(crmSnapshot.averageTicket)}
Producto mas vendido: ${crmSnapshot.topProduct ? `${crmSnapshot.topProduct.name} (${crmSnapshot.topProduct.units} unidades)` : 'Sin datos'}
Cantidad de ventas completadas (30 dias): ${crmSnapshot.salesCount}`
}

function formatColumnSummaries(
  summaries: ColumnSummary[],
) {
  return summaries
    .map(
      (summary) =>
        `- ${summary.label}: ${summary.main} (${summary.secondary}${summary.tertiary ? `, ${summary.tertiary}` : ''})`,
    )
    .join('\n')
}

interface CrmVsDatasetInput {
  crmSnapshot: CrmMetricsSnapshot
  datasetName: string
  tableName: string
  columnSummaries: ColumnSummary[]
}

export async function compareCrmVsDataset({
  crmSnapshot,
  datasetName,
  tableName,
  columnSummaries,
}: CrmVsDatasetInput): Promise<AiAnalysisResult> {
  const prompt = `Eres un analista comercial senior. Compara los datos internos de nuestro CRM contra un dataset externo (${datasetName} - ${tableName}) y produce un analisis estrategico en español.

Datos CRM (nuestra empresa):
${formatCrmSnapshot(crmSnapshot)}

Datos externos (procesados desde el archivo cargado):
${formatColumnSummaries(columnSummaries)}

Identifica la brecha entre ambos, su causa probable, recomendaciones concretas, un plan de mejora accionable, que esta haciendo mejor la fuente externa y como podriamos aprovecharlo, y una conclusion estrategica.

${RESPONSE_SCHEMA_HINT}`

  return callGemini(prompt)
}

interface DatasetsComparisonInput {
  crmSnapshot: CrmMetricsSnapshot
  internalName: string
  externalName: string
  internalBreakdown: ProductBreakdownItem[]
  externalBreakdown: ProductBreakdownItem[]
}

function formatBreakdown(
  items: ProductBreakdownItem[],
) {
  return items
    .slice(0, 25)
    .map(
      (item) =>
        `- ${item.product}: ${money.format(item.total)} (${item.units} registros)`,
    )
    .join('\n')
}

export async function compareDatasets({
  crmSnapshot,
  internalName,
  externalName,
  internalBreakdown,
  externalBreakdown,
}: DatasetsComparisonInput): Promise<AiAnalysisResult> {
  const externalByProduct = new Map(
    externalBreakdown.map((item) => [
      item.product
        .trim()
        .toLowerCase(),
      item,
    ]),
  )

  const matched = internalBreakdown
    .map((item) => {
      const match =
        externalByProduct.get(
          item.product
            .trim()
            .toLowerCase(),
        )

      if (!match) {
        return null
      }

      const gapPct =
        match.total === 0
          ? 0
          : ((item.total -
              match.total) /
              match.total) *
            100

      return {
        product: item.product,
        mio: item.total,
        externo: match.total,
        gapPct,
      }
    })
    .filter(
      (
        item,
      ): item is NonNullable<
        typeof item
      > => item !== null,
    )

  const matchedText =
    matched.length > 0
      ? matched
          .slice(0, 25)
          .map(
            (item) =>
              `- ${item.product}: nosotros ${money.format(item.mio)} vs competencia ${money.format(item.externo)} (brecha ${item.gapPct.toFixed(1)}%)`,
          )
          .join('\n')
      : 'No se encontraron productos con el mismo nombre en ambos datasets; usa los totales por producto de cada lado para inferir similitudes.'

  const prompt = `Eres un analista comercial senior. Compara "${internalName}" (nuestros datos propios) contra "${externalName}" (datos de la competencia o de un tercero) y produce un analisis estrategico en español.

Contexto interno del CRM (para referencia adicional):
${formatCrmSnapshot(crmSnapshot)}

Totales por producto - ${internalName} (nuestro):
${formatBreakdown(internalBreakdown) || 'Sin datos suficientes.'}

Totales por producto - ${externalName} (comparado):
${formatBreakdown(externalBreakdown) || 'Sin datos suficientes.'}

Productos coincidentes entre ambos datasets:
${matchedText}

Identifica la brecha general, su causa probable, recomendaciones concretas, un plan de mejora accionable, que esta haciendo mejor la competencia y como podriamos aprovechar eso para potenciar nuestras ventas, y una conclusion estrategica.

${RESPONSE_SCHEMA_HINT}`

  return callGemini(prompt)
}

interface SaveInsightInput {
  analysis: AiAnalysisResult
  comparisonMode: ComparisonMode
  datasetId: string | null
  tableId: string | null
  comparedDatasetId: string | null
  crmSnapshot: unknown
  externalSnapshot: unknown
}

interface InsightRow {
  id: string
  dataset_id: string | null
  table_id: string | null
  compared_dataset_id: string | null
  comparison_mode: ComparisonMode
  title: string
  gap: string | null
  probable_cause: string | null
  recommendations: string[]
  comparison: InsightRecord['comparison']
  improvement_plan: string[]
  competitor_advantage: string | null
  conclusion: string | null
  crm_snapshot: unknown
  external_snapshot: unknown
  published: boolean
  created_by: string | null
  created_at: string
  published_at: string | null
}

function fromRow(
  row: InsightRow,
): InsightRecord {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    tableId: row.table_id,
    comparedDatasetId:
      row.compared_dataset_id,
    comparisonMode:
      row.comparison_mode,
    title: row.title,
    gap: row.gap ?? '',
    probableCause:
      row.probable_cause ?? '',
    recommendations:
      row.recommendations ?? [],
    comparison:
      row.comparison ?? [],
    improvementPlan:
      row.improvement_plan ?? [],
    competitorAdvantage:
      row.competitor_advantage ?? '',
    conclusion:
      row.conclusion ?? '',
    crmSnapshot: row.crm_snapshot,
    externalSnapshot:
      row.external_snapshot,
    published: row.published,
    createdBy: row.created_by,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  }
}

export async function saveInsight({
  analysis,
  comparisonMode,
  datasetId,
  tableId,
  comparedDatasetId,
  crmSnapshot,
  externalSnapshot,
}: SaveInsightInput): Promise<InsightRecord> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } =
    await supabase
      .from('insights')
      .insert({
        dataset_id: datasetId,
        table_id: tableId,
        compared_dataset_id:
          comparedDatasetId,
        comparison_mode:
          comparisonMode,
        title: analysis.title,
        gap: analysis.gap,
        probable_cause:
          analysis.probableCause,
        recommendations:
          analysis.recommendations,
        comparison:
          analysis.comparison,
        improvement_plan:
          analysis.improvementPlan,
        competitor_advantage:
          analysis.competitorAdvantage,
        conclusion:
          analysis.conclusion,
        crm_snapshot: crmSnapshot,
        external_snapshot:
          externalSnapshot,
        created_by:
          user?.id ?? null,
      })
      .select('*')
      .single()

  if (error) {
    throw toError(error)
  }

  return fromRow(
    data as InsightRow,
  )
}

export async function publishInsight(
  id: string,
  published: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('insights')
    .update({
      published,
      published_at: published
        ? new Date().toISOString()
        : null,
    })
    .eq('id', id)

  if (error) {
    throw toError(error)
  }
}

export async function listInsights(
  options: {
    onlyPublished?: boolean
  } = {},
): Promise<InsightRecord[]> {
  let query = supabase
    .from('insights')
    .select('*')
    .order('created_at', {
      ascending: false,
    })

  if (options.onlyPublished) {
    query = query.eq(
      'published',
      true,
    )
  }

  const { data, error } = await query

  if (error) {
    throw toError(error)
  }

  return (data as InsightRow[]).map(
    fromRow,
  )
}

export async function getInsight(
  id: string,
): Promise<
  InsightRecord | undefined
> {
  const { data, error } =
    await supabase
      .from('insights')
      .select('*')
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw toError(error)
  }

  return data
    ? fromRow(data as InsightRow)
    : undefined
}
