import { LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { getSales } from '../../services/crmStorage.service'
import { generateStrategicInsight } from '../../services/strategicInsight.service'
import type { DatasetRecord } from '../../types/dataset.types'

export default function StrategicInsight({ dataset }: { dataset: DatasetRecord }) {
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const sales = await getSales()
      setReport(await generateStrategicInsight(sales, dataset))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo generar el insight.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Sparkles size={18} />
            <h3 className="text-sm font-semibold">Análisis estratégico con IA</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Compara este dataset con las métricas de ventas de los últimos 30 días.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => void generate()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
          {loading ? 'Analizando...' : 'Comparar con mi CRM y generar Insight'}
        </button>
      </div>
      {error && <p className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</p>}
      {report && <div className="mt-6 whitespace-pre-wrap rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5 text-sm leading-7 text-[var(--text-secondary)]">{report}</div>}
    </section>
  )
}
