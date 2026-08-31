import {
  ArrowLeft,
  BarChart3,
  Columns3,
  LoaderCircle,
  Sparkles,
  Table2,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router'

import DatasetDashboard from '../../components/insights/DatasetDashboard'
import DatasetGrid from '../../components/insights/DatasetGrid'
import DatasetSchemaEditor from '../../components/insights/DatasetSchemaEditor'

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
  updateCell,
  updateTableColumns,
} from '../../services/datasetStorage.service'

import type {
  DatasetCell,
  DatasetColumn,
  DatasetRecord,
  DatasetTable,
} from '../../types/dataset.types'

type ViewMode =
  | 'dashboard'
  | 'data'
  | 'columns'

const CRM_TARGET = 'crm'

export default function DatasetDetailPage() {
  const { datasetId } =
    useParams()

  const navigate = useNavigate()

  const [
    dataset,
    setDataset,
  ] =
    useState<
      DatasetRecord | null
    >(null)

  const [
    internalDatasets,
    setInternalDatasets,
  ] = useState<DatasetRecord[]>([])

  const [
    selectedTableId,
    setSelectedTableId,
  ] =
    useState('')

  const [
    view,
    setView,
  ] =
    useState<ViewMode>(
      'dashboard',
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    compareTarget,
    setCompareTarget,
  ] = useState(CRM_TARGET)

  const [
    comparing,
    setComparing,
  ] = useState(false)

  const [
    compareError,
    setCompareError,
  ] = useState('')

  useEffect(() => {
    const load =
      async () => {
        if (!datasetId) {
          setLoading(false)
          return
        }

        const [result, allDatasets] =
          await Promise.all([
            getDataset(datasetId),
            getDatasets(),
          ])

        if (result) {
          setDataset(result)

          setSelectedTableId(
            result.tables[0]
              ?.id ?? '',
          )
        }

        setInternalDatasets(
          allDatasets.filter(
            (item) =>
              item.sourceType ===
                'internal' &&
              item.id !== datasetId,
          ),
        )

        setLoading(false)
      }

    void load()
  }, [datasetId])

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Cargando dataset...
      </p>
    )
  }

  if (!dataset) {
    return (
      <div>
        <p className="text-sm text-[var(--text-muted)]">
          Dataset no encontrado.
        </p>

        <Link
          to="/admin/insights"
          className="mt-4 inline-block text-sm font-medium text-[var(--accent)]"
        >
          Volver
        </Link>
      </div>
    )
  }

  const selectedTable:
    | DatasetTable
    | undefined =
    dataset.tables.find(
      (table) =>
        table.id ===
        selectedTableId,
    ) ??
    dataset.tables[0]

  const saveColumns =
    async (
      columns:
        DatasetColumn[],
    ) => {
      if (!selectedTable) {
        return
      }

      await updateTableColumns(
        selectedTable.id,
        columns,
      )

      setDataset(
        (current) =>
          current && {
            ...current,

            tables:
              current.tables.map(
                (table) =>
                  table.id ===
                  selectedTable.id
                    ? {
                        ...table,
                        columns,
                      }
                    : table,
              ),
          },
      )
    }

  const saveCell =
    async (
      rowId: string,
      columnKey: string,
      value: DatasetCell,
    ) => {
      if (!selectedTable) {
        return
      }

      setDataset(
        (current) =>
          current && {
            ...current,

            tables:
              current.tables.map(
                (table) => {
                  if (
                    table.id !==
                    selectedTable.id
                  ) {
                    return table
                  }

                  return {
                    ...table,

                    rows:
                      table.rows.map(
                        (row) =>
                          row.__rowId ===
                          rowId
                            ? {
                                ...row,
                                [columnKey]:
                                  value,
                              }
                            : row,
                      ),
                  }
                },
              ),
          },
      )

      await updateCell(
        selectedTable.id,
        rowId,
        columnKey,
        value,
      )
    }

  const runComparison =
    async () => {
      if (!selectedTable) {
        return
      }

      setComparing(true)
      setCompareError('')

      try {
        const crmSnapshot =
          await getCrmMetricsSnapshot()

        if (
          compareTarget ===
          CRM_TARGET
        ) {
          const columnSummaries =
            selectedTable.columns
              .filter(
                (column) =>
                  column.visible !==
                  false,
              )
              .map((column) =>
                summarizeColumn(
                  column,
                  selectedTable.rows.map(
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
                > =>
                  summary !== null,
              )

          const analysis =
            await compareCrmVsDataset(
              {
                crmSnapshot,
                datasetName:
                  dataset.name,
                tableName:
                  selectedTable.name,
                columnSummaries,
              },
            )

          const saved =
            await saveInsight({
              analysis,
              comparisonMode:
                'crm',
              datasetId:
                dataset.id,
              tableId:
                selectedTable.id,
              comparedDatasetId:
                null,
              crmSnapshot,
              externalSnapshot:
                columnSummaries,
            })

          navigate(
            `/admin/insights/analisis/${saved.id}`,
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
            selectedTable,
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
            tableId:
              selectedTable.id,
            comparedDatasetId:
              internalDataset.id,
            crmSnapshot,
            externalSnapshot: {
              internalBreakdown,
              externalBreakdown,
            },
          })

        navigate(
          `/admin/insights/analisis/${saved.id}`,
        )
      } catch (exception) {
        setCompareError(
          exception instanceof
            Error
            ? exception.message
            : 'No se pudo generar el analisis.',
        )
      } finally {
        setComparing(false)
      }
    }

  const visibleCount =
    selectedTable
      ?.columns
      .filter(
        (column) =>
          column.visible !==
          false,
      )
      .length ?? 0

  return (
    <div className="space-y-6">
      <section>
        <Link
          to="/admin/insights"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Datasets
        </Link>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            {dataset.extension}
          </p>

          <h2 className="mt-1 break-all text-2xl font-semibold text-[var(--text-primary)]">
            {dataset.name}
          </h2>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {dataset.truncated
              ? `Mostrando ${selectedTable?.rows.length.toLocaleString('es-PE') ?? 0} de ${dataset.totalRows.toLocaleString('es-PE')} filas`
              : `${selectedTable?.rows.length.toLocaleString('es-PE') ?? 0} filas`}{' '}
            ·{' '}
            {visibleCount}{' '}
            columnas visibles
          </p>
        </div>
      </section>

      <section className="flex gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1">
        <button
          type="button"
          onClick={() =>
            setView(
              'dashboard',
            )
          }
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            view ===
            'dashboard'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <BarChart3 size={16} />
          Dashboard
        </button>

        <button
          type="button"
          onClick={() =>
            setView('data')
          }
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            view === 'data'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Table2 size={16} />
          Datos
        </button>

        <button
          type="button"
          onClick={() =>
            setView(
              'columns',
            )
          }
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            view ===
            'columns'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Columns3 size={16} />
          Columnas
        </button>
      </section>

      {dataset.tables.length >
        1 && (
        <section className="flex gap-2 overflow-x-auto">
          {dataset.tables.map(
            (table) => (
              <button
                type="button"
                key={
                  table.id
                }
                onClick={() =>
                  setSelectedTableId(
                    table.id,
                  )
                }
                className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm ${
                  selectedTable?.id ===
                  table.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                }`}
              >
                {
                  table.name
                }
              </button>
            ),
          )}
        </section>
      )}

      {selectedTable &&
        view ===
          'dashboard' && (
          <>
            <DatasetDashboard
              dataset={
                dataset
              }
              table={
                selectedTable
              }
            />

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkles
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Analista IA
                  </p>

                  <p className="text-xs text-[var(--text-muted)]">
                    Genera un insight comparando este dataset contra tu CRM o contra uno de tus datasets propios.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={
                    compareTarget
                  }
                  onChange={(
                    event,
                  ) =>
                    setCompareTarget(
                      event
                        .target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] sm:w-80"
                >
                  <option
                    value={
                      CRM_TARGET
                    }
                  >
                    Mi CRM (ventas registradas)
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

                <button
                  type="button"
                  disabled={
                    comparing
                  }
                  onClick={
                    runComparison
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {comparing ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles
                      size={16}
                    />
                  )}

                  {comparing
                    ? 'Analizando...'
                    : 'Comparar con mi CRM y generar Insight'}
                </button>
              </div>

              {compareError && (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                  {compareError}
                </div>
              )}
            </section>
          </>
        )}

      {selectedTable &&
        view ===
          'data' && (
          <DatasetGrid
            table={
              selectedTable
            }
            onCellChange={
              saveCell
            }
          />
        )}

      {selectedTable &&
        view ===
          'columns' && (
          <DatasetSchemaEditor
            columns={
              selectedTable.columns
            }
            onSave={
              saveColumns
            }
          />
        )}
    </div>
  )
}
