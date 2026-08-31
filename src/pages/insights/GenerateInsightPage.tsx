import {
  ArrowLeft,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router'

import {
  compareCrmVsDataset,
  compareDatasets,
  saveInsight,
} from '../../services/aiInsights.service'

import { getCrmMetricsSnapshot } from '../../services/crmMetrics.service'

import {
  buildProductBreakdown,
  summarizeColumn,
} from '../../services/datasetSummary.service'

import {
  getDataset,
  getDatasets,
} from '../../services/datasetStorage.service'

import type { DatasetRecord } from '../../types/dataset.types'

const CRM_TARGET = 'crm'

export default function GenerateInsightPage() {
  const navigate = useNavigate()

  const [
    datasets,
    setDatasets,
  ] = useState<DatasetRecord[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] = useState('')

  const [
    compareTarget,
    setCompareTarget,
  ] = useState(CRM_TARGET)

  const [
    generating,
    setGenerating,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    const load = async () => {
      const all = await getDatasets()

      setDatasets(all)

      const firstExternal =
        all.find(
          (item) =>
            item.sourceType ===
            'external',
        )

      setSelectedDatasetId(
        firstExternal?.id ?? '',
      )

      setLoading(false)
    }

    void load()
  }, [])

  const externalDatasets =
    datasets.filter(
      (item) =>
        item.sourceType ===
        'external',
    )

  const internalDatasets =
    datasets.filter(
      (item) =>
        item.sourceType ===
          'internal' &&
        item.id !==
          selectedDatasetId,
    )

  const runComparison = async () => {
    if (!selectedDatasetId) {
      setError(
        'Selecciona un dataset para comparar.',
      )
      return
    }

    setGenerating(true)
    setError('')

    try {
      const dataset =
        await getDataset(
          selectedDatasetId,
        )

      const table =
        dataset?.tables[0]

      if (!dataset || !table) {
        throw new Error(
          'No se pudo cargar el dataset seleccionado.',
        )
      }

      const crmSnapshot =
        await getCrmMetricsSnapshot()

      if (
        compareTarget ===
        CRM_TARGET
      ) {
        const columnSummaries =
          table.columns
            .filter(
              (column) =>
                column.visible !==
                false,
            )
            .map((column) =>
              summarizeColumn(
                column,
                table.rows.map(
                  (row) =>
                    row[
                      column.key
                    ],
                ),
              ),
            )
            .filter(
              (
                summary,
              ): summary is NonNullable<
                typeof summary
              > => summary !== null,
            )

        const analysis =
          await compareCrmVsDataset(
            {
              crmSnapshot,
              datasetName:
                dataset.name,
              tableName:
                table.name,
              columnSummaries,
            },
          )

        const saved =
          await saveInsight({
            analysis,
            comparisonMode:
              'crm',
            datasetId: dataset.id,
            tableId: table.id,
            comparedDatasetId:
              null,
            crmSnapshot,
            externalSnapshot:
              columnSummaries,
          })

        navigate(
          `/app/insights/${saved.id}`,
        )

        return
      }

      const internalDataset =
        await getDataset(
          compareTarget,
        )

      const internalTable =
        internalDataset
          ?.tables[0]

      if (
        !internalDataset ||
        !internalTable
      ) {
        throw new Error(
          'No se pudo cargar el dataset interno seleccionado.',
        )
      }

      const internalBreakdown =
        buildProductBreakdown(
          internalTable,
        )

      const externalBreakdown =
        buildProductBreakdown(
          table,
        )

      const analysis =
        await compareDatasets({
          crmSnapshot,
          internalName:
            internalDataset.name,
          externalName:
            dataset.name,
          internalBreakdown,
          externalBreakdown,
        })

      const saved =
        await saveInsight({
          analysis,
          comparisonMode:
            'datasets',
          datasetId: dataset.id,
          tableId: table.id,
          comparedDatasetId:
            internalDataset.id,
          crmSnapshot,
          externalSnapshot: {
            internalBreakdown,
            externalBreakdown,
          },
        })

      navigate(
        `/app/insights/${saved.id}`,
      )
    } catch (exception) {
      setError(
        exception instanceof
          Error
          ? exception.message
          : 'No se pudo generar el analisis.',
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <Link
          to="/app/insights"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Insights
        </Link>

        <p className="mt-5 text-sm font-medium text-[var(--accent)]">
          Inteligencia
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Generar analisis comparativo
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Elige un dataset y compáralo contra tus ventas registradas o
          contra otro de tus datasets propios.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">
            Cargando datasets disponibles...
          </p>
        ) : externalDatasets.length ===
          0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Todavia no hay datasets disponibles para comparar.
          </p>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Dataset a analizar
              </span>

              <select
                value={
                  selectedDatasetId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedDatasetId(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                {externalDatasets.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {item.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Comparar contra
              </span>

              <select
                value={
                  compareTarget
                }
                onChange={(
                  event,
                ) =>
                  setCompareTarget(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                <option
                  value={
                    CRM_TARGET
                  }
                >
                  Mis ventas registradas
                </option>

                {internalDatasets.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.name
                      }{' '}
                      (mis datos)
                    </option>
                  ),
                )}
              </select>
            </label>

            <button
              type="button"
              disabled={
                generating
              }
              onClick={
                runComparison
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Sparkles
                  size={16}
                />
              )}

              {generating
                ? 'Analizando...'
                : 'Generar Insight'}
            </button>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                {error}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
