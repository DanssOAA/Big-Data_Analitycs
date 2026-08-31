import {
  FileUp,
  LoaderCircle,
  PackagePlus,
  Truck,
  UploadCloud,
} from 'lucide-react'

import {
  useRef,
  useState,
  type DragEvent,
} from 'react'

import { Link } from 'react-router'

import {
  importHistoricalTable,
  type BulkImportProgress,
} from '../../services/bulkImport.service'

import { parseDatasetFile } from '../../services/datasetParser.service'

import {
  importProductsFromFile,
  type ProductImportProgress,
} from '../../services/productImport.service'

import { detectShipmentColumns } from '../../services/shipmentsStorage.service'

import DangerZoneMenu from './DangerZoneMenu'

type ImportMode =
  | 'products'
  | 'history'

interface VisibleProgress {
  label: string
  imported: number
  total: number
}

const STAGE_LABELS: Record<
  BulkImportProgress['stage'],
  string
> = {
  clients: 'Creando clientes',
  products: 'Creando productos',
  sales: 'Importando ventas',
  shipments: 'Importando envíos',
}

export default function BulkUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] =
    useState<ImportMode>('products')

  const [processing, setProcessing] =
    useState(false)

  const [dragging, setDragging] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const [progress, setProgress] =
    useState<VisibleProgress | null>(null)

  const showProductProgress = (
    next: ProductImportProgress,
  ) => {
    setProgress({
      label: 'Importando productos',
      ...next,
    })
  }

  const showHistoricalProgress = (
    next: BulkImportProgress,
  ) => {
    setProgress({
      label: STAGE_LABELS[next.stage],
      imported: next.imported,
      total: next.total,
    })
  }

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
    setProgress(null)

    const failed: string[] = []
    let importedFiles = 0

    let productsCreated = 0
    let productsUpdated = 0
    let rowsSkipped = 0

    let clientsCreated = 0
    let historicalProductsCreated = 0
    let salesImported = 0
    let shipmentsImported = 0

    for (const file of selectedFiles) {
      try {
        if (mode === 'products') {
          const result =
            await importProductsFromFile(
              file,
              showProductProgress,
            )

          productsCreated += result.created
          productsUpdated += result.updated
          rowsSkipped += result.skipped
          importedFiles += 1
          continue
        }

        const parsed =
          await parseDatasetFile(file)

        const historicalTables =
          parsed.tables.filter(
            (table) =>
              detectShipmentColumns(table) !==
              null,
          )

        if (historicalTables.length === 0) {
          throw new Error(
            'No se encontraron las columnas Origen y Destino requeridas para un histórico.',
          )
        }

        for (const table of historicalTables) {
          const result =
            await importHistoricalTable(
              table,
              showHistoricalProgress,
            )

          clientsCreated +=
            result.clientsCreated
          historicalProductsCreated +=
            result.productsCreated
          salesImported +=
            result.salesImported
          shipmentsImported +=
            result.shipmentsImported
        }

        importedFiles += 1
      } catch (exception) {
        failed.push(
          `${file.name}: ${
            exception instanceof Error
              ? exception.message
              : 'Error desconocido'
          }`,
        )
      }
    }

    if (importedFiles > 0) {
      if (mode === 'products') {
        setMessage(
          `${productsCreated.toLocaleString('es-PE')} productos creados y ${productsUpdated.toLocaleString('es-PE')} actualizados` +
            (rowsSkipped > 0
              ? `; ${rowsSkipped.toLocaleString('es-PE')} filas vacías omitidas.`
              : '.') +
            ' El archivo no fue almacenado.',
        )
      } else {
        setMessage(
          `${clientsCreated.toLocaleString('es-PE')} clientes y ${historicalProductsCreated.toLocaleString('es-PE')} productos creados; ${salesImported.toLocaleString('es-PE')} ventas y ${shipmentsImported.toLocaleString('es-PE')} envíos importados. El archivo no fue almacenado.`,
        )
      }
    }

    if (failed.length > 0) {
      setError(failed.join(' | '))
    }

    setProcessing(false)
    setProgress(null)

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

  const progressPercentage =
    progress && progress.total > 0
      ? Math.round(
          (progress.imported /
            progress.total) *
            100,
        )
      : 0

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
              Carga masiva al CRM
            </p>

            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              El archivo se usa solo para leer las filas: no se guarda ni se crea un dataset. Cada fila se convierte en un registro real del CRM.
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
              ? 'Importando...'
              : 'Seleccionar archivo'}
          </button>

          <DangerZoneMenu />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={processing}
          onClick={() => setMode('products')}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
            mode === 'products'
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
              : 'border-[var(--border)] bg-[var(--surface-elevated)]'
          }`}
        >
          <PackagePlus
            size={18}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />

          <span>
            <span className="block text-sm font-semibold text-[var(--text-primary)]">
              Productos
            </span>

            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
              Crea o actualiza el catálogo usando Código, Producto, Categoría, Unidad y Precio.
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={processing}
          onClick={() => setMode('history')}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
            mode === 'history'
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
              : 'border-[var(--border)] bg-[var(--surface-elevated)]'
          }`}
        >
          <Truck
            size={18}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />

          <span>
            <span className="block text-sm font-semibold text-[var(--text-primary)]">
              Histórico logístico
            </span>

            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
              Convierte un histórico en Clientes, Productos, Ventas y Envíos.
            </span>
          </span>
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
        className={`mt-4 rounded-xl border border-dashed p-5 text-center text-sm transition ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--text-muted)]'
        }`}
      >
        Arrastra aquí CSV, XLS o XLSX para importar como{' '}
        <span className="font-semibold text-[var(--text-secondary)]">
          {mode === 'products'
            ? 'Productos'
            : 'Histórico logístico'}
        </span>
        .
      </div>

      {processing && progress && (
        <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <span>{progress.label}</span>
            <span>
              {progress.imported.toLocaleString(
                'es-PE',
              )}{' '}
              /{' '}
              {progress.total.toLocaleString(
                'es-PE',
              )}
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 sm:flex-row sm:items-center">
          <span>{message}</span>

          <Link
            to={
              mode === 'products'
                ? '/app/productos'
                : '/app/envios'
            }
            className="shrink-0 font-semibold"
          >
            Ver registros
          </Link>
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
