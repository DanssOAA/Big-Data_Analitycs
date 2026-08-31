import {
  ArrowUpRight,
  FileUp,
  LoaderCircle,
  UploadCloud,
} from 'lucide-react'

import {
  useRef,
  useState,
  type DragEvent,
} from 'react'

import { Link } from 'react-router'

import { uploadDataset } from '../../services/datasetStorage.service'

export default function BulkUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastDatasetId, setLastDatasetId] = useState('')

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
    setLastDatasetId('')

    const created: string[] = []
    const failed: string[] = []
    let createdId = ''

    for (const file of selectedFiles) {
      try {
        const dataset =
          await uploadDataset(file)

        created.push(file.name)
        createdId = dataset.id
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

    if (created.length > 0) {
      setMessage(
        created.length === 1
          ? `"${created[0]}" cargado correctamente.`
          : `${created.length} archivos cargados correctamente.`,
      )

      setLastDatasetId(createdId)
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
    void processFiles(event.dataTransfer.files)
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
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

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <UploadCloud size={20} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Carga masiva de datos
            </p>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Sube un archivo CSV o Excel para analizarlo con IA.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={processing}
          onClick={() =>
            inputRef.current?.click()
          }
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
            : 'Seleccionar archivo'}
        </button>
      </div>

      <div
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
        className={`mt-5 rounded-xl border border-dashed p-5 text-center text-sm transition ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--text-muted)]'
        }`}
      >
        O arrastra el archivo aqui — CSV, XLS o XLSX.
      </div>

      {message && (
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 sm:flex-row sm:items-center">
          <span>{message}</span>

          {lastDatasetId && (
            <Link
              to={`/admin/insights/dataset/${lastDatasetId}`}
              className="inline-flex shrink-0 items-center gap-1.5 font-semibold"
            >
              Ver dataset
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
        </div>
      )}
    </section>
  )
}
