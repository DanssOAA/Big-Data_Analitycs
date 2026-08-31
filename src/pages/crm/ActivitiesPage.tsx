import {
  Activity,
  Plus,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  getActivities,
  saveActivity,
} from '../../services/activitiesStorage.service'

import { getClients } from '../../services/crmStorage.service'

import type {
  CrmActivity,
  CrmClient,
} from '../../types/crm.types'

const activityTypes = [
  'Llamada',
  'Reunion',
  'Correo',
  'Seguimiento',
  'Otro',
]

function nowLocalDatetime() {
  const now = new Date()

  now.setMinutes(
    now.getMinutes() -
      now.getTimezoneOffset(),
  )

  return now
    .toISOString()
    .slice(0, 16)
}

interface ActivityForm {
  clientId: string
  type: string
  description: string
  activityDate: string
}

function emptyForm(): ActivityForm {
  return {
    clientId: '',
    type: activityTypes[0],
    description: '',
    activityDate:
      nowLocalDatetime(),
  }
}

export default function ActivitiesPage() {
  const [
    activities,
    setActivities,
  ] = useState<CrmActivity[]>([])

  const [
    clients,
    setClients,
  ] = useState<CrmClient[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false)

  const [saving, setSaving] =
    useState(false)

  const [form, setForm] =
    useState<ActivityForm>(
      emptyForm(),
    )

  useEffect(() => {
    const loadData = async () => {
      const [
        storedActivities,
        storedClients,
      ] = await Promise.all([
        getActivities(),
        getClients(),
      ])

      setActivities(
        storedActivities,
      )

      setClients(storedClients)
      setLoading(false)
    }

    void loadData()
  }, [])

  const clientMap = useMemo(
    () =>
      new Map(
        clients.map(
          (client) => [
            client.id,
            client,
          ],
        ),
      ),
    [clients],
  )

  const createActivity = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (
      !form.description.trim() ||
      !form.activityDate
    ) {
      return
    }

    setSaving(true)

    try {
      const activity: CrmActivity = {
        id: crypto.randomUUID(),
        clientId:
          form.clientId || null,
        type: form.type,
        description:
          form.description.trim(),
        activityDate: new Date(
          form.activityDate,
        ).toISOString(),
        createdAt:
          new Date().toISOString(),
      }

      await saveActivity(activity)

      setActivities(
        (current) => [
          activity,
          ...current,
        ].sort(
          (a, b) =>
            new Date(
              b.activityDate,
            ).getTime() -
            new Date(
              a.activityDate,
            ).getTime(),
        ),
      )

      setCreateOpen(false)
      setForm(emptyForm())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            CRM
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Actividades
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {activities.length}{' '}
            {activities.length === 1
              ? 'actividad registrada'
              : 'actividades registradas'}
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(emptyForm())
            setCreateOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus size={17} />
          Registrar actividad
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-soft)] p-5">
          <Activity
            size={19}
            className="text-[var(--accent)]"
          />

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Seguimiento comercial
            </p>

            <p className="text-xs text-[var(--text-muted)]">
              Llamadas, reuniones y correos registrados por el equipo.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-[var(--text-muted)]">
            Cargando actividades...
          </div>
        ) : activities.length ===
          0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-muted)]">
              <Activity size={21} />
            </div>

            <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
              Sin actividades
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
              Registra la primera actividad de seguimiento del equipo comercial.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]">
            {activities.map(
              (activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                        {activity.type}
                      </span>

                      {activity.clientId && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {clientMap.get(
                            activity.clientId,
                          )?.name ??
                            'Cliente'}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {
                        activity.description
                      }
                    </p>
                  </div>

                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(
                      activity.activityDate,
                    ).toLocaleString(
                      'es-PE',
                      {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-5">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Registrar actividad
              </h3>

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    false,
                  )
                }
                className="rounded-lg p-2 text-[var(--text-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                createActivity
              }
              className="space-y-4 p-6"
            >
              <select
                value={
                  form.clientId
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    clientId:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                <option value="">
                  Sin cliente asociado
                </option>

                {clients.map(
                  (client) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
                      }
                    >
                      {
                        client.name
                      }{' '}
                      -{' '}
                      {
                        client.company
                      }
                    </option>
                  ),
                )}
              </select>

              <select
                value={form.type}
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    type: event
                      .target
                      .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                {activityTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ),
                )}
              </select>

              <textarea
                required
                rows={3}
                placeholder="Descripcion"
                value={
                  form.description
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    description:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
              />

              <input
                type="datetime-local"
                required
                value={
                  form.activityDate
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    activityDate:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCreateOpen(
                      false,
                    )
                  }
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
