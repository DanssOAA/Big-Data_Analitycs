import {
  Building2,
  FileSpreadsheet,
  Trash2,
  UserRoundCheck,
} from 'lucide-react'

import { Link } from 'react-router'

import type { DatasetRecord } from '../../types/dataset.types'

interface DatasetCardProps {
  dataset: DatasetRecord
  onDelete: (
    id: string,
  ) => void
  onToggleSourceType: (
    dataset: DatasetRecord,
  ) => void
}

function formatSize(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

export default function DatasetCard({
  dataset,
  onDelete,
  onToggleSourceType,
}: DatasetCardProps) {
  const isInternal =
    dataset.sourceType ===
    'internal'

  const previewTable =
    dataset.tables[0]

  const previewColumns =
    previewTable?.columns.slice(
      0,
      3,
    ) ?? []

  const previewRows =
    previewTable?.rows.slice(
      0,
      3,
    ) ?? []

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] transition hover:border-[var(--border)]">
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <FileSpreadsheet size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            to={`/admin/insights/dataset/${dataset.id}`}
            className="block truncate text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]"
          >
            {dataset.name}
          </Link>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {dataset.totalRows.toLocaleString(
              'es-PE',
            )}{' '}
            filas ·{' '}
            {dataset.totalColumns}{' '}
            columnas ·{' '}
            {dataset.tables.length}{' '}
            {dataset.tables.length === 1
              ? 'tabla'
              : 'tablas'}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onDelete(
              dataset.id,
            )
          }
          title="Eliminar dataset"
          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-500"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {previewColumns.length > 0 && (
        <div className="mx-5 overflow-hidden rounded-xl border border-[var(--border-soft)]">
          <div
            className="grid bg-[var(--surface-elevated)]"
            style={{
              gridTemplateColumns:
                `repeat(${previewColumns.length}, minmax(0, 1fr))`,
            }}
          >
            {previewColumns.map(
              (column) => (
                <div
                  key={column.key}
                  className="truncate px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                  title={
                    column.label
                  }
                >
                  {column.label}
                </div>
              ),
            )}
          </div>

          {previewRows.map(
            (row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid border-t border-[var(--border-soft)]"
                style={{
                  gridTemplateColumns:
                    `repeat(${previewColumns.length}, minmax(0, 1fr))`,
                }}
              >
                {previewColumns.map(
                  (column) => (
                    <div
                      key={
                        column.key
                      }
                      className="truncate px-3 py-2 text-xs text-[var(--text-secondary)]"
                      title={String(
                        row[
                          column.key
                        ] ?? '',
                      )}
                    >
                      {String(
                        row[
                          column.key
                        ] ?? '',
                      )}
                    </div>
                  ),
                )}
              </div>
            ),
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-[10px] font-semibold uppercase text-[var(--text-secondary)]">
            {dataset.extension}
          </span>

          <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-muted)]">
            {formatSize(
              dataset.sizeBytes,
            )}
          </span>

          <button
            type="button"
            onClick={() =>
              onToggleSourceType(
                dataset,
              )
            }
            title="Cambiar entre mis datos y competencia"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              isInternal
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {isInternal ? (
              <UserRoundCheck
                size={11}
              />
            ) : (
              <Building2
                size={11}
              />
            )}

            {isInternal
              ? 'Mis datos'
              : 'Competencia'}
          </button>
        </div>

        <Link
          to={`/admin/insights/dataset/${dataset.id}`}
          className="text-xs font-semibold text-[var(--accent)]"
        >
          Abrir dataset
        </Link>
      </div>
    </article>
  )
}
