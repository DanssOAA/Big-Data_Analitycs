import { ExternalLink, Eye, FilePenLine, FileText, Plus, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  deleteDocument, getDocuments, getDocumentUrl, updateDocument, uploadDocument,
  type DocumentRecord,
} from '../../services/documentationStorage.service'

const size = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.ceil(bytes / 1024)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function DocumentationPage() {
  const { can } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'upload' | 'edit' | null>(null)
  const [selected, setSelected] = useState<DocumentRecord | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<DocumentRecord | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    void getDocuments().then(setDocuments).catch(() => setError('No se pudo cargar la documentación.')).finally(() => setLoading(false))
  }, [])

  const close = () => { setModal(null); setSelected(null); setFile(null); setName(''); setDescription(''); setError('') }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (modal === 'upload' && (!file || file.type !== 'application/pdf')) {
      setError('Selecciona un archivo PDF válido.')
      return
    }
    setBusy(true); setError('')
    try {
      if (modal === 'upload' && file) {
        const created = await uploadDocument(file, description)
        setDocuments((current) => [created, ...current])
      } else if (selected && name.trim()) {
        const updated = await updateDocument(selected.id, name, description)
        setDocuments((current) => current.map((item) => item.id === updated.id ? updated : item))
      }
      close()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el documento.')
    } finally { setBusy(false) }
  }

  const remove = async (document: DocumentRecord) => {
    if (!window.confirm(`¿Eliminar "${document.name}" permanentemente?`)) return
    try {
      await deleteDocument(document)
      setDocuments((current) => current.filter((item) => item.id !== document.id))
    } catch { setError('No se pudo eliminar el documento.') }
  }

  const showPreview = async (document: DocumentRecord) => {
    setPreview(document)
    setPreviewUrl('')
    setPreviewLoading(true)
    setError('')
    try {
      setPreviewUrl(await getDocumentUrl(document))
    } catch {
      setPreview(null)
      setError('No se pudo generar la previsualización del PDF.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreview(null)
    setPreviewUrl('')
  }

  return <div className="space-y-6">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">Archivos</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Documentación</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Consulta y administra los documentos PDF del sistema.</p>
      </div>
      {can('documentation', 'create') && <button type="button" onClick={() => setModal('upload')} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/> Subir PDF</button>}
    </section>

    {error && !modal && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
      {loading ? <p className="p-10 text-center text-sm text-[var(--text-muted)]">Cargando documentos...</p>
        : documents.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto text-[var(--text-muted)]" size={38}/><p className="mt-3 text-sm text-[var(--text-secondary)]">Todavía no hay documentos PDF.</p></div>
        : documents.map((document) => <article key={document.id} className="flex flex-col gap-4 border-b border-[var(--border-soft)] p-5 last:border-0 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500"><FileText size={21}/></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--text-primary)]">{document.name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{size(document.file_size)} · {new Date(document.created_at).toLocaleDateString('es-MX')}</p>{document.description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{document.description}</p>}</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void showPreview(document)} title="Previsualizar PDF" className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"><Eye size={17}/><span className="hidden md:inline">Ver PDF</span></button>
            {can('documentation', 'update') && <button type="button" onClick={() => { setSelected(document); setName(document.name); setDescription(document.description ?? ''); setModal('edit') }} title="Editar datos" className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"><FilePenLine size={17}/></button>}
            {can('documentation', 'delete') && <button type="button" onClick={() => void remove(document)} title="Eliminar" className="rounded-lg border border-rose-500/20 p-2 text-rose-500"><Trash2 size={17}/></button>}
          </div>
        </article>)}
    </section>

    {preview && <div className="fixed inset-0 z-[70] flex flex-col bg-black/75 p-2 backdrop-blur-sm sm:p-5">
      <section className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500"><FileText size={19}/></div>
          <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{preview.name}</h3><p className="text-xs text-[var(--text-muted)]">Previsualización del documento</p></div>
          {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"><ExternalLink size={16}/><span className="hidden sm:inline">Abrir aparte</span></a>}
          <button type="button" onClick={closePreview} aria-label="Cerrar previsualización" className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"><X size={18}/></button>
        </header>
        <div className="relative min-h-0 flex-1 bg-[#525659]">
          {previewLoading && <div className="absolute inset-0 flex items-center justify-center"><p className="rounded-lg bg-black/40 px-4 py-2 text-sm text-white">Cargando PDF...</p></div>}
          {previewUrl && <iframe src={`${previewUrl}#view=FitH`} title={`Previsualización de ${preview.name}`} className="h-full w-full border-0" />}
        </div>
      </section>
    </div>}

    {modal && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
      <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-[var(--text-primary)]">{modal === 'upload' ? 'Subir documento PDF' : 'Editar documento'}</h3><button type="button" onClick={close}><X size={20}/></button></div>
      <div className="mt-5 space-y-4">
        {modal === 'upload' ? <label className="block rounded-xl border border-dashed border-[var(--border)] p-6 text-center"><Upload className="mx-auto text-[var(--accent)]"/><span className="mt-2 block text-sm text-[var(--text-secondary)]">{file?.name ?? 'Seleccionar PDF (máximo 20 MB)'}</span><input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required/></label>
          : <label className="block text-sm text-[var(--text-secondary)]">Nombre<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[var(--text-primary)]"/></label>}
        <label className="block text-sm text-[var(--text-secondary)]">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[var(--text-primary)]"/></label>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm">Cancelar</button><button disabled={busy} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando...' : 'Guardar'}</button></div>
    </form></div>}
  </div>
}
