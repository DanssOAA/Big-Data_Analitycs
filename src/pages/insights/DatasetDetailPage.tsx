import {
  ArrowLeft,
  BarChart3,
  Columns3,
  Table2,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router'

import DatasetDashboard from '../../components/insights/DatasetDashboard'
import DatasetGrid from '../../components/insights/DatasetGrid'
import DatasetSchemaEditor from '../../components/insights/DatasetSchemaEditor'
import StrategicInsight from '../../components/insights/StrategicInsight'

import {
  getDataset,
  getDatasetTablePage,
  updateDatasetColumns,
  updateDatasetRow,
} from '../../services/datasetStorage.service'

import type {
  DatasetCell,
  DatasetColumn,
  DatasetRecord,
  DatasetRow,
  DatasetTable,
} from '../../types/dataset.types'

type ViewMode =
  | 'dashboard'
  | 'data'
  | 'columns'

export default function DatasetDetailPage() {
  const { datasetId } =
    useParams()

  const [
    dataset,
    setDataset,
  ] =
    useState<
      DatasetRecord | null
    >(null)

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

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [pageRows, setPageRows] = useState<DatasetRow[]>([])
  const [pageTotalRows, setPageTotalRows] = useState(0)
  const [pageLoading, setPageLoading] = useState(false)

  useEffect(() => {
    const load =
      async () => {
        if (!datasetId) {
          setLoading(false)
          return
        }

        const result =
          await getDataset(
            datasetId,
          )

        if (result) {
          setDataset(result)

          setSelectedTableId(
            result.tables[0]
              ?.id ?? '',
          )
        }

        setLoading(false)
      }

    void load()
  }, [datasetId])

  useEffect(() => {
    if (!selectedTableId || view !== 'data') return

    let active = true
    // La carga sincroniza la página seleccionada con los datos remotos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageLoading(true)

    void getDatasetTablePage(selectedTableId, page, pageSize)
      .then((result) => {
        if (!active) return
        setPageRows(result.rows)
        setPageTotalRows(result.totalRows)
      })
      .finally(() => {
        if (active) setPageLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedTableId, view, page, pageSize])

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

      const updated:
        DatasetRecord = {
        ...dataset,

        tables:
          dataset.tables.map(
            (table) =>
              table.id ===
              selectedTable.id
                ? {
                    ...table,
                    columns,
                  }
                : table,
          ),
      }

      await updateDatasetColumns(
        selectedTable.id,
        columns,
      )

      setDataset(
        updated,
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

      const updated:
        DatasetRecord = {
        ...dataset,

        tables:
          dataset.tables.map(
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
      }

      const pageRow = pageRows.find(
        (row) => row.__rowId === rowId,
      )

      const rowNumber = pageRow?.__rowNumber

      if (typeof rowNumber !== 'number') {
        return
      }

      setDataset(updated)

      const updatedPageRow = {
        ...pageRow,
        [columnKey]: value,
      }
      setPageRows((rows) => rows.map((row) => row.__rowId === rowId ? updatedPageRow : row))

      await updateDatasetRow(
        selectedTable.id,
        rowNumber,
        updatedPageRow,
      )
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
            {selectedTable?.rows.length.toLocaleString(
              'es-PE',
            ) ?? 0}{' '}
            filas cargadas
            {selectedTable?.totalRows && selectedTable.totalRows > selectedTable.rows.length
              ? ` de ${selectedTable.totalRows.toLocaleString('es-PE')}`
              : ''}{' '}
            ·{' '}
            {visibleCount}{' '}
            columnas visibles
          </p>

          {selectedTable?.totalRows && selectedTable.totalRows > selectedTable.rows.length && (
            <p className="mt-2 text-xs text-amber-500">
              Vista previa limitada a las primeras {selectedTable.rows.length.toLocaleString('es-PE')} filas para mantener una navegación rápida.
            </p>
          )}
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

      <StrategicInsight dataset={dataset} />

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
                  {
                    setSelectedTableId(table.id)
                    setPage(0)
                  }
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
          <DatasetDashboard
            dataset={
              dataset
            }
            table={
              selectedTable
            }
          />
        )}

      {selectedTable &&
        view ===
          'data' && (
          <DatasetGrid
            table={{ ...selectedTable, rows: pageRows }}
            page={page}
            pageSize={pageSize}
            totalRows={pageTotalRows || selectedTable.totalRows || 0}
            loading={pageLoading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(0)
            }}
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
