import {
  AllCommunityModule,
  themeQuartz,
  type CellValueChangedEvent,
  type ColDef,
} from 'ag-grid-community'

import {
  AgGridProvider,
  AgGridReact,
} from 'ag-grid-react'

import { Search } from 'lucide-react'

import {
  useMemo,
  useState,
} from 'react'

import { useTheme } from '../../context/ThemeContext'

import { parseNumericValue } from '../../services/datasetParser.service'

import type {
  DatasetCell,
  DatasetColumn,
  DatasetRow,
  DatasetTable,
} from '../../types/dataset.types'

interface DatasetGridProps {
  table: DatasetTable

  onCellChange?: (
    rowId: string,
    columnKey: string,
    value: DatasetCell,
  ) => Promise<void> | void
}

function normalizeEditedValue(
  value: unknown,
  column: DatasetColumn,
): DatasetCell {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null
  }

  if (
    column.type ===
    'number'
  ) {
    return (
      parseNumericValue(
        String(value),
      ) ??
      String(value)
    )
  }

  if (
    column.type ===
    'boolean'
  ) {
    const text =
      String(value)
        .trim()
        .toLowerCase()

    if (
      [
        'true',
        'si',
        'sí',
        '1',
      ].includes(text)
    ) {
      return true
    }

    if (
      [
        'false',
        'no',
        '0',
      ].includes(text)
    ) {
      return false
    }
  }

  return String(value).trim()
}

export default function DatasetGrid({
  table,
  onCellChange,
}: DatasetGridProps) {
  const [
    search,
    setSearch,
  ] = useState('')

  const { theme } =
    useTheme()

  const visibleColumns =
    useMemo(
      () =>
        table.columns.filter(
          (column) =>
            column.visible !==
            false,
        ),
      [table.columns],
    )

  const gridTheme =
    useMemo(
      () =>
        themeQuartz.withParams(
          theme === 'dark'
            ? {
                backgroundColor:
                  '#0f131a',
                foregroundColor:
                  '#f5f7fa',
                headerBackgroundColor:
                  '#171c26',
                borderColor:
                  '#232a35',
                rowHoverColor:
                  '#151a23',
                fontSize: 13,
              }
            : {
                backgroundColor:
                  '#ffffff',
                foregroundColor:
                  '#171a21',
                headerBackgroundColor:
                  '#f2f4f7',
                borderColor:
                  '#d7dce5',
                rowHoverColor:
                  '#f8f9fb',
                fontSize: 13,
              },
        ),
      [theme],
    )

  const columnDefs =
    useMemo<
      ColDef<DatasetRow>[]
    >(
      () =>
        visibleColumns.map(
          (column) => ({
            field:
              column.key,

            headerName:
              column.label,

            sortable: true,

            resizable: true,

            editable: true,

            minWidth: 140,

            filter:
              column.type ===
              'number'
                ? 'agNumberColumnFilter'
                : column.type ===
                    'date'
                  ? 'agDateColumnFilter'
                  : 'agTextColumnFilter',

            valueFormatter: (
              params,
            ) => {
              if (
                params.value ===
                  null ||
                params.value ===
                  undefined
              ) {
                return ''
              }

              return String(
                params.value,
              )
            },
          }),
        ),
      [visibleColumns],
    )

  const handleCellChange = (
    event: CellValueChangedEvent<DatasetRow>,
  ) => {
    const field =
      event.colDef.field

    if (
      !field ||
      !event.data
    ) {
      return
    }

    const column =
      table.columns.find(
        (item) =>
          item.key ===
          field,
      )

    if (!column) {
      return
    }

    const rowId =
      event.data.__rowId

    if (
      typeof rowId !==
      'string'
    ) {
      return
    }

    const value =
      normalizeEditedValue(
        event.newValue,
        column,
      )

    void onCellChange?.(
      rowId,
      field,
      value,
    )
  }

  if (
    visibleColumns.length ===
    0
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No hay columnas visibles.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {table.name}
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {table.rows.length.toLocaleString(
              'es-PE',
            )}{' '}
            filas ·{' '}
            {visibleColumns.length}{' '}
            columnas visibles
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Haz doble clic sobre una celda para editarla.
          </p>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Buscar..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:w-72"
          />
        </div>
      </div>

      <div className="h-[620px] overflow-hidden rounded-xl border border-[var(--border)]">
        <AgGridProvider
          modules={[
            AllCommunityModule,
          ]}
        >
          <AgGridReact<DatasetRow>
            theme={
              gridTheme
            }

            rowData={
              table.rows
            }

            columnDefs={
              columnDefs
            }

            getRowId={(
              params,
            ) =>
              String(
                params.data
                  .__rowId,
              )
            }

            quickFilterText={
              search
            }

            cacheQuickFilter

            pagination

            paginationPageSize={
              50
            }

            paginationPageSizeSelector={[
              25,
              50,
              100,
            ]}

            animateRows={
              false
            }

            onCellValueChanged={
              handleCellChange
            }
          />
        </AgGridProvider>
      </div>
    </div>
  )
}
