import {
  ArrowUpRight,
  Database,
  FileUp,
  LoaderCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react'

import { Link } from 'react-router'

import DatasetCard from '../../components/insights/DatasetCard'

import { listInsights } from '../../services/aiInsights.service'

import {
  deleteDataset,
  getDatasets,
  setDatasetSourceType,
  uploadDataset,
} from '../../services/datasetStorage.service'

import type { DatasetRecord } from '../../types/dataset.types'
import type { InsightRecord } from '../../types/insight.types'

export default function InsightsExplorerPage() {
  const [datasets, setDatasets] = useState<DatasetRecord[]>([])
  const [insights, setInsights] = useState<InsightRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  const loadDatasets = async () => {
    try {
      const [stored, storedInsights] =
        await Promise.all([
          getDatasets(),
          listInsights(),
        ])

      setDatasets(stored)
      setInsights(storedInsights)
    } catch {
      setError('No se pudieron cargar los datasets guardados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDatasets()
  }, [])

  const processFiles = async (
    files: FileList | File[],
  ) => {
    const selectedFiles = Array.from(files)

    if (selectedFiles.length === 0) {
      return
    }

    setProcessing(true)
    setMessage('')
    setError('')

    const created: string[] = []
    const failed: string[] = []

    for (const file of selectedFiles) {
      try {
        await uploadDataset(file)

        created.push(file.name)
      } catch (exception) {
        const description =
          exception instanceof Error
            ? exception.message
            : 'Error desconocido'

        failed.push(
          `${file.name}: ${description}`,
        )
      }
    }

    await loadDatasets()

    if (created.length > 0) {
      setMessage(
        created.length === 1
          ? `Dataset "${created[0]}" creado correctamente.`
          : `${created.length} datasets creados correctamente.`,
      )
    }

    if (failed.length > 0) {
      setError(failed.join(' | '))
    }

    setProcessing(false)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    setDragging(false)

    void processFiles(
      event.dataTransfer.files,
    )
  }

  const handleDelete = async (
    id: string,
  ) => {
    const dataset = datasets.find(
      (item) => item.id === id,
    )

    const confirmed = window.confirm(
      dataset
        ? `¿Eliminar el dataset "${dataset.name}"?`
        : '¿Eliminar este dataset?',
    )

    if (!confirmed) {
      return
    }

    await deleteDataset(id)

    setDatasets((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    )

    setMessage('Dataset eliminado.')
  }

  const handleToggleSourceType = async (
    dataset: DatasetRecord,
  ) => {
    const nextType =
      dataset.sourceType ===
      'internal'
        ? 'external'
        : 'internal'

    setDatasets((current) =>
      current.map((item) =>
        item.id === dataset.id
          ? {
              ...item,
              sourceType:
                nextType,
            }
          : item,
      ),
    )

    try {
      await setDatasetSourceType(
        dataset.id,
        nextType,
      )
    } catch {
      setError(
        'No se pudo actualizar el tipo de dataset.',
      )

      await loadDatasets()
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            void processFiles(
              event.target.files,
            )
          }
        }}
      />

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            Datos
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Datasets
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Cada archivo cargado se conserva como un dataset independiente.
          </p>
        </div>

        <button
          type="button"
          disabled={processing}
          onClick={() =>
            inputRef.current?.click()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <FileUp size={17} />
          )}

          {processing
            ? 'Procesando...'
            : 'Crear dataset'}
        </button>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
        </div>
      )}

      <section
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={handleDrop}
        className={`rounded-2xl border border-dashed p-7 text-center transition ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border)] bg-[var(--surface)]'
        }`}
      >
        <UploadCloud
          size={24}
          className="mx-auto text-[var(--accent)]"
        />

        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
          Arrastra archivos aqui
        </p>

        <p className="mt-1 text-xs text-[var(--text-muted)]">
          CSV, XLS o XLSX
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <Database
            size={18}
            className="text-[var(--accent)]"
          />

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Mis datasets
            </h3>

            <p className="text-xs text-[var(--text-muted)]">
              {datasets.length}{' '}
              {datasets.length === 1
                ? 'dataset guardado'
                : 'datasets guardados'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderCircle
              size={24}
              className="animate-spin text-[var(--accent)]"
            />
          </div>
        ) : datasets.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-14 text-center">
            <Database
              size={30}
              className="mx-auto text-[var(--text-muted)]"
            />

            <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
              Todavia no tienes datasets
            </p>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Carga tu primer archivo para comenzar.
            </p>

            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
            >
              Seleccionar archivo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {datasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onDelete={handleDelete}
                onToggleSourceType={
                  handleToggleSourceType
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <Sparkles
            size={18}
            className="text-[var(--accent)]"
          />

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Insights generados
            </h3>

            <p className="text-xs text-[var(--text-muted)]">
              {insights.length}{' '}
              {insights.length === 1
                ? 'analisis generado'
                : 'analisis generados'}
            </p>
          </div>
        </div>

        {insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
            Todavia no se generaron analisis. Abre un dataset para comparar sus indicadores con tus ventas registradas.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
            {insights.map(
              (insight) => (
                <div
                  key={insight.id}
                  className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] p-5 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                          insight.published
                            ? 'bg-emerald-400/10 text-emerald-400'
                            : 'bg-amber-400/10 text-amber-400'
                        }`}
                      >
                        {insight.published
                          ? 'Publicado'
                          : 'Borrador'}
                      </span>

                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        {insight.comparisonMode ===
                        'datasets'
                          ? 'Mis datos vs competencia'
                          : 'Dataset vs mis ventas'}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                      {insight.title}
                    </p>
                  </div>

                  <Link
                    to={`/admin/insights/analisis/${insight.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--accent)]"
                  >
                    Ver
                    <ArrowUpRight
                      size={14}
                    />
                  </Link>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}
