import {
  ArrowUpRight,
  FileUp,
  LoaderCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

import {
  useRef,
  useState,
  type DragEvent,
} from 'react'

import { Link } from 'react-router'

import { uploadDataset } from '../../services/datasetStorage.service'

import {
  detectShipmentColumns,
  importShipmentsFromTable,
} from '../../services/shipmentsStorage.service'

import type { DatasetTable } from '../../types/dataset.types'

import DangerZoneMenu from './DangerZoneMenu'

export default function BulkUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastDatasetId, setLastDatasetId] = useState('')

  const [
    shipmentTable,
    setShipmentTable,
  ] = useState<DatasetTable | null>(
    null,
  )

  const [
    importing,
    setImporting,
  ] = useState(false)

  const [
    importMessage,
    setImportMessage,
  ] = useState('')

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
    setShipmentTable(null)
    setImportMessage('')

    const created: string[] = []
    const failed: string[] = []
    let createdId = ''
    let matchedTable: DatasetTable | null =
      null

    for (const file of selectedFiles) {
      try {
        const dataset =
          await uploadDataset(file)

        created.push(file.name)
        createdId = dataset.id

        if (!matchedTable) {
          matchedTable =
            dataset.tables.find(
              (table) =>
                detectShipmentColumns(
                  table,
                ) !== null,
            ) ?? null
        }
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
      setShipmentTable(matchedTable)
    }

    if (failed.length > 0) {
      setError(failed.join(' | '))
    }

    setProcessing(false)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleImportShipments =
    async () => {
      if (!shipmentTable) {
        return
      }

      setImporting(true)
      setImportMessage('')

      try {
        const result =
          await importShipmentsFromTable(
            shipmentTable,
          )

        setImportMessage(
          `${result.imported.toLocaleString('es-PE')} envios importados` +
            (result.clientsCreated > 0
              ? ` (${result.clientsCreated} clientes nuevos creados).`
              : '.'),
        )

        setShipmentTable(null)
      } catch (exception) {
        setError(
          exception instanceof Error
            ? exception.message
            : 'No se pudo importar el archivo como envios.',
        )
      } finally {
        setImporting(false)
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
              Sube un archivo CSV o Excel para analizarlo con IA, o para llenar tus modulos con datos reales.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
              : 'Seleccionar archivo'}
          </button>

          <DangerZoneMenu />
        </div>
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

      {shipmentTable && (
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-primary)] sm:flex-row sm:items-center">
          <span>
            Este archivo tiene forma de historico de envios (
            {shipmentTable.rows.length.toLocaleString(
              'es-PE',
            )}{' '}
            filas). Puedes llenar el modulo de Envios con estos
            datos reales.
          </span>

          <button
            type="button"
            disabled={importing}
            onClick={() =>
              void handleImportShipments()
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? (
              <LoaderCircle
                size={14}
                className="animate-spin"
              />
            ) : (
              <Sparkles size={14} />
            )}

            {importing
              ? 'Importando...'
              : 'Importar como Envios'}
          </button>
        </div>
      )}

      {importMessage && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {importMessage}
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
