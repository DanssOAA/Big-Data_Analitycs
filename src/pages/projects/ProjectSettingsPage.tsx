import { Save, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useProject } from '../../context/ProjectContext'
import { addMember, getAssignableUsers, getProjectMembers, removeMember, updateProject } from '../../services/projectStorage.service'
import type { ProjectMember } from '../../types/project.types'

export default function ProjectSettingsPage() {
  const { projectId = '' } = useParams(); const navigate = useNavigate()
  const { projects, refreshProjects, deleteProject } = useProject(); const project = projects.find((item) => item.id === projectId)
  const [members, setMembers] = useState<ProjectMember[]>([]); const [available, setAvailable] = useState<Array<{id:string;email:string;full_name:string|null}>>([])
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [message, setMessage] = useState('')
  const load = async () => { const [nextMembers, nextAvailable] = await Promise.all([getProjectMembers(projectId), getAssignableUsers(projectId)]); setMembers(nextMembers); setAvailable(nextAvailable) }
  useEffect(() => { if (project) { setName(project.name); setDescription(project.description); void load() } }, [projectId, project])
  if (!project) return <p className="text-sm text-[var(--text-muted)]">Proyecto no encontrado.</p>
  const submit = async (event: FormEvent) => { event.preventDefault(); await updateProject(projectId, name, description); await refreshProjects(); setMessage('Proyecto actualizado.') }
  return <div className="space-y-6"><div><p className="text-sm font-medium text-[var(--accent)]">Administración</p><h2 className="text-2xl font-semibold text-[var(--text-primary)]">{project.name}</h2></div>{message && <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm text-[var(--text-secondary)]">{message}</p>}
    <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5"><label className="block text-sm text-[var(--text-secondary)]">Nombre<input required value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"/></label><label className="block text-sm text-[var(--text-secondary)]">Descripción<textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"/></label><button className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white"><Save size={15}/>Guardar</button></form>
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5"><h3 className="font-semibold text-[var(--text-primary)]">Equipo</h3><div className="mt-4 flex flex-wrap gap-2">{available.map((user)=><button key={user.id} onClick={() => void addMember(projectId,user.id).then(load)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"><UserPlus size={14}/>{user.full_name ?? user.email}</button>)}</div><ul className="mt-4 divide-y divide-[var(--border-soft)]">{members.map((member)=><li key={member.userId} className="flex items-center justify-between py-3 text-sm"><span>{member.fullName ?? member.email}<small className="ml-2 text-[var(--text-muted)]">{member.email}</small></span><button aria-label="Quitar miembro" onClick={() => void removeMember(projectId,member.userId).then(load)} className="text-rose-500"><UserMinus size={16}/></button></li>)}</ul></section>
    <section className="rounded-2xl border border-rose-300 p-5"><h3 className="font-semibold text-rose-600">Zona peligrosa</h3><p className="my-2 text-sm text-[var(--text-secondary)]">Solo se puede eliminar un proyecto sin datos.</p><button onClick={() => void deleteProject(projectId).then(()=>navigate('/admin/proyectos')).catch((error: Error)=>setMessage(error.message))} className="inline-flex items-center gap-2 rounded-xl border border-rose-400 px-4 py-2 text-sm text-rose-600"><Trash2 size={15}/>Eliminar proyecto vacío</button></section>
  </div>
}
