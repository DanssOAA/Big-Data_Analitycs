import { GoogleGenerativeAI } from '@google/generative-ai'

import type { CrmSale } from '../types/crm.types'
import type { DatasetRecord } from '../types/dataset.types'

const MAX_ROWS_PER_TABLE = 200
const MAX_COLUMNS_PER_TABLE = 40
const MAX_DATASET_CHARACTERS = 60_000
const GEMINI_MODELS = [
  { name: 'gemini-2.5-flash', attempts: 3 },
  { name: 'gemini-2.5-flash-lite', attempts: 2 },
]

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function isTransientGeminiError(exception: unknown) {
  const message = exception instanceof Error
    ? exception.message.toLowerCase()
    : String(exception).toLowerCase()

  return /\b(408|429|500|502|503|504)\b|high demand|unavailable|temporar|fetch failed|network/.test(message)
}

function getCrmMetrics(sales: CrmSale[]) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const completed = sales.filter((sale) =>
    sale.status === 'Completada' && new Date(`${sale.date}T00:00:00`) >= cutoff,
  )
  const totalSales = completed.reduce((total, sale) => total + sale.amount, 0)
  const products = new Map<string, number>()

  completed.forEach((sale) => products.set(
    sale.product,
    (products.get(sale.product) ?? 0) + sale.quantity,
  ))
  const topProduct = Array.from(products.entries()).sort((a, b) => b[1] - a[1])[0]

  return {
    totalSales,
    averageTicket: completed.length ? totalSales / completed.length : 0,
    topProduct: topProduct?.[0] ?? 'Sin ventas completadas',
    topProductUnits: topProduct?.[1] ?? 0,
    saleCount: completed.length,
  }
}

function datasetToText(dataset: DatasetRecord) {
  return dataset.tables.map((table) => {
    const columns = table.columns
      .filter((column) => column.visible !== false)
      .slice(0, MAX_COLUMNS_PER_TABLE)
    const rows = table.rows.slice(0, MAX_ROWS_PER_TABLE).map((row) =>
      columns.map((column) => String(row[column.key] ?? '')).join(' | '),
    )

    return [
      `TABLA: ${table.name}`,
      `Filas totales: ${table.rows.length}`,
      columns.map((column) => column.label).join(' | '),
      ...rows,
    ].join('\n')
  }).join('\n\n').slice(0, MAX_DATASET_CHARACTERS)
}

export function buildStrategicPrompt(sales: CrmSale[], dataset: DatasetRecord) {
  const metrics = getCrmMetrics(sales)

  return `Eres un consultor estratégico especializado en análisis comercial. Compara los datos internos del CRM con el dataset externo. Responde únicamente en español y no inventes cifras ni columnas.

DATOS DE NUESTRA EMPRESA (CRM, últimos 30 días, solo ventas completadas):
- Total de ventas: S/ ${metrics.totalSales.toFixed(2)}
- Ticket promedio: S/ ${metrics.averageTicket.toFixed(2)}
- Producto más vendido: ${metrics.topProduct} (${metrics.topProductUnits} unidades)
- Cantidad de ventas: ${metrics.saleCount}

DATOS DE LA EMPRESA EXTERNA (${dataset.name}):
El archivo puede contener múltiples tablas y formatos inconsistentes. Identifica ventas, ingresos, precios, cantidades, categorías y productos. Los datos enviados pueden ser una muestra si el archivo es grande.

${datasetToText(dataset)}

INSTRUCCIONES DEL REPORTE:
1. BRECHA (GAP): indica en qué métricas la empresa externa supera a la nuestra y por cuánto, usando porcentaje y/o importe cuando sea calculable. Muestra los valores comparados.
2. RAZÓN (CAUSA): explica, basándote exclusivamente en los datos, qué factores podrían explicar el resultado. Diferencia hechos de hipótesis.
3. ACCIONES (RECOMENDACIÓN): propone exactamente 2 acciones concretas, realistas y medibles para reducir la brecha.
4. CONCLUSIÓN: resume la prioridad estratégica en 2 o 3 frases.

Si una comparación no es válida por falta de datos, periodos, moneda o unidades incompatibles, indícalo. No asumas que el dataset pertenece a un competidor si no lo demuestra. Usa los títulos: ## Brecha, ## Razón, ## Acciones y ## Conclusión.`
}

export async function generateStrategicInsight(sales: CrmSale[], dataset: DatasetRecord) {
  const apiKey = import.meta.env.API_KEY
  if (!apiKey) throw new Error('No se encontró API_KEY en el archivo .env.')

  const client = new GoogleGenerativeAI(apiKey)
  const prompt = buildStrategicPrompt(sales, dataset)
  let lastError: unknown

  for (const modelConfig of GEMINI_MODELS) {
    const model = client.getGenerativeModel({ model: modelConfig.name })

    for (let attempt = 0; attempt < modelConfig.attempts; attempt += 1) {
      try {
        const result = await model.generateContent(prompt)
        const report = result.response.text().trim()
        if (!report) throw new Error('Gemini no devolvió contenido para el reporte.')
        return report
      } catch (exception) {
        lastError = exception
        if (!isTransientGeminiError(exception)) throw exception

        const hasAnotherAttempt = attempt + 1 < modelConfig.attempts
        if (hasAnotherAttempt) {
          const baseDelay = 1000 * (2 ** attempt)
          const jitter = Math.floor(Math.random() * 500)
          await wait(baseDelay + jitter)
        }
      }
    }
  }

  if (isTransientGeminiError(lastError)) {
    throw new Error(
      'Gemini está temporalmente saturado. Se intentó nuevamente y también se probó el modelo alternativo. Espera unos minutos y vuelve a intentarlo.',
    )
  }

  throw lastError
}
