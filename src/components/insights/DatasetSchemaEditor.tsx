import {
  Eye,
  EyeOff,
  RotateCcw,
  Save,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import type {
  DatasetColumn,
  DatasetColumnType,
} from '../../types/dataset.types'

interface DatasetSchemaEditorProps {
  columns: DatasetColumn[]
  onSave: (
    columns: DatasetColumn[],
  ) => Promise<void> | void
}

const typeOptions: Array<{
  value: DatasetColumnType
  label: string
}> = [
  {
    value: 'text',
    label: 'Texto',
  },
  {
    value: 'number',
    label: 'Numero',
  },
  {
    value: 'date',
    label: 'Fecha',
  },
  {
    value: 'boolean',
    label: 'Booleano',
  },
  {
    value: 'empty',
    label: 'Vacio',
  },
]

export default function DatasetSchemaEditor({
  columns,
  onSave,
}: DatasetSchemaEditorProps) {
  const [
    draft,
    setDraft,
  ] =
    useState<
      DatasetColumn[]
    >([])

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    saved,
    setSaved,
  ] =
    useState(false)

  useEffect(() => {
    setDraft(
      columns.map(
        (column) => ({
          ...column,
        }),
      ),
    )
  }, [columns])

  const updateColumn = (
    key: string,
    changes: Partial<DatasetColumn>,
  ) => {
    setSaved(false)

    setDraft(
      (current) =>
        current.map(
          (column) =>
            column.key ===
            key
              ? {
                  ...column,
                  ...changes,
                }
              : column,
        ),
    )
  }

  const restoreColumn = (
    key: string,
  ) => {
    const original =
      columns.find(
        (column) =>
          column.key ===
          key,
      )

    if (!original) {
      return
    }

    updateColumn(
      key,
      {
        label:
          original.originalLabel,
        type:
          original.type,
        visible: true,
      },
    )
  }

  const restoreAll = () => {
    setSaved(false)

    setDraft(
      columns.map(
        (column) => ({
          ...column,

          label:
            column.originalLabel,

          visible: true,
        }),
      ),
    )
  }

  const save = async () => {
    setSaving(true)

    try {
      await onSave(
        draft,
      )

      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Configuracion de columnas
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Los cambios afectan solamente la presentacion del dataset. Los datos internos permanecen intactos.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              restoreAll
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
          >
            <RotateCcw
              size={15}
            />

            Restaurar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void save()
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            <Save size={15} />

            {saving
              ? 'Guardando...'
              : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          Configuracion guardada.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="grid grid-cols-[minmax(160px,1fr)_minmax(200px,1.3fr)_150px_90px_48px] gap-3 border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span>
            Original
          </span>

          <span>
            Nombre visible
          </span>

          <span>
            Tipo
          </span>

          <span>
            Visible
          </span>

          <span />
        </div>

        <div className="max-h-[650px] overflow-auto">
          {draft.map(
            (column) => (
              <div
                key={
                  column.key
                }
                className="grid grid-cols-[minmax(160px,1fr)_minmax(200px,1.3fr)_150px_90px_48px] items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-sm text-[var(--text-secondary)]"
                    title={
                      column.originalLabel
                    }
                  >
                    {
                      column.originalLabel
                    }
                  </p>

                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                    {
                      column.key
                    }
                  </p>
                </div>

                <input
                  value={
                    column.label
                  }
                  onChange={(
                    event,
                  ) =>
                    updateColumn(
                      column.key,
                      {
                        label:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                  className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />

                <select
                  value={
                    column.type
                  }
                  onChange={(
                    event,
                  ) =>
                    updateColumn(
                      column.key,
                      {
                        type:
                          event
                            .target
                            .value as DatasetColumnType,
                      },
                    )
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  {typeOptions.map(
                    (
                      option,
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    updateColumn(
                      column.key,
                      {
                        visible:
                          !column.visible,
                      },
                    )
                  }
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                    column.visible
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  {column.visible ? (
                    <Eye
                      size={14}
                    />
                  ) : (
                    <EyeOff
                      size={14}
                    />
                  )}

                  {column.visible
                    ? 'Si'
                    : 'No'}
                </button>

                <button
                  type="button"
                  title="Restaurar columna"
                  onClick={() =>
                    restoreColumn(
                      column.key,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw
                    size={14}
                  />
                </button>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
