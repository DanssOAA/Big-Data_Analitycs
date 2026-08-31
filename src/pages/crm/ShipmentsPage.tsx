import {
  Plus,
  Truck,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import { getClients } from '../../services/crmStorage.service'

import {
  deleteShipment,
  getShipments,
  saveShipment,
} from '../../services/shipmentsStorage.service'

import type {
  CrmClient,
  Shipment,
  ShipmentStatus,
} from '../../types/crm.types'

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
  },
)

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

interface ShipmentForm {
  clientId: string
  origin: string
  destination: string
  carrier: string
  cargoType: string
  weightKg: number
  distanceKm: number
  cost: number
  deliveryDays: number
  status: ShipmentStatus
  shippedDate: string
}

function emptyForm(): ShipmentForm {
  return {
    clientId: '',
    origin: '',
    destination: '',
    carrier: '',
    cargoType: '',
    weightKg: 0,
    distanceKm: 0,
    cost: 0,
    deliveryDays: 1,
    status: 'En transito',
    shippedDate: today(),
  }
}

const statusStyles: Record<
  ShipmentStatus,
  string
> = {
  Entregado:
    'bg-emerald-500/10 text-emerald-600',
  'En transito':
    'bg-amber-500/10 text-amber-600',
  Retrasado:
    'bg-orange-500/10 text-orange-600',
  Cancelado:
    'bg-rose-500/10 text-rose-500',
}

export default function ShipmentsPage() {
  const [
    shipments,
    setShipments,
  ] = useState<Shipment[]>([])

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
    useState<ShipmentForm>(
      emptyForm(),
    )

  useEffect(() => {
    const load = async () => {
      const [
        storedShipments,
        storedClients,
      ] = await Promise.all([
        getShipments(),
        getClients(),
      ])

      setShipments(
        storedShipments,
      )
      setClients(storedClients)
      setLoading(false)
    }

    void load()
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

  const createShipment = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (
      !form.origin.trim() ||
      !form.destination.trim() ||
      !form.carrier.trim() ||
      !form.cargoType.trim()
    ) {
      return
    }

    setSaving(true)

    try {
      const shipment: Shipment = {
        id: crypto.randomUUID(),
        code: `ENV-${Date.now()
          .toString()
          .slice(-6)}`,
        clientId:
          form.clientId || null,
        origin: form.origin.trim(),
        destination:
          form.destination.trim(),
        carrier:
          form.carrier.trim(),
        cargoType:
          form.cargoType.trim(),
        weightKg: form.weightKg,
        distanceKm:
          form.distanceKm,
        cost: form.cost,
        deliveryDays:
          form.deliveryDays,
        status: form.status,
        shippedDate:
          form.shippedDate,
        createdAt:
          new Date().toISOString(),
      }

      await saveShipment(
        shipment,
      )

      setShipments((current) => [
        shipment,
        ...current,
      ])

      setCreateOpen(false)
      setForm(emptyForm())
    } finally {
      setSaving(false)
    }
  }

  const removeShipment = async (
    shipment: Shipment,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar el envio "${shipment.code}"?`,
      )

    if (!confirmed) {
      return
    }

    await deleteShipment(
      shipment.id,
    )

    setShipments((current) =>
      current.filter(
        (item) =>
          item.id !==
          shipment.id,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            CRM
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Envios
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {shipments.length}{' '}
            {shipments.length === 1
              ? 'envio registrado'
              : 'envios registrados'}
            . Datos logisticos que
            alimentan futuros analisis de IA.
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
          Registrar envio
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-soft)] p-5">
          <Truck
            size={19}
            className="text-[var(--accent)]"
          />

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Operaciones logisticas
            </p>

            <p className="text-xs text-[var(--text-muted)]">
              Rutas, transportistas y tiempos de entrega.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-[var(--text-muted)]">
            Cargando envios...
          </div>
        ) : shipments.length ===
          0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No hay envios registrados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  {[
                    'Envio',
                    'Cliente',
                    'Ruta',
                    'Transportista',
                    'Costo',
                    'Entrega',
                    'Estado',
                    '',
                  ].map((column) => (
                    <th
                      key={column}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {shipments.map(
                  (shipment) => {
                    const client =
                      shipment.clientId
                        ? clientMap.get(
                            shipment.clientId,
                          )
                        : undefined

                    return (
                      <tr
                        key={
                          shipment.id
                        }
                        className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-hover)]"
                      >
                        <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                          {
                            shipment.code
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {client?.name ??
                            'Sin cliente'}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {
                              shipment.origin
                            }{' '}
                            →{' '}
                            {
                              shipment.destination
                            }
                          </p>

                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {
                              shipment.cargoType
                            }{' '}
                            ·{' '}
                            {
                              shipment.distanceKm
                            }{' '}
                            km
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {
                            shipment.carrier
                          }
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">
                          {money.format(
                            shipment.cost,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {
                            shipment.deliveryDays
                          }{' '}
                          dias
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[shipment.status]}`}
                          >
                            {
                              shipment.status
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              void removeShipment(
                                shipment,
                              )
                            }
                            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-500"
                          >
                            <X
                              size={14}
                            />
                          </button>
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-5">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Registrar envio
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
                createShipment
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

              <div className="grid grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Origen"
                  value={
                    form.origin
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      origin:
                        event
                          .target
                          .value,
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />

                <input
                  required
                  placeholder="Destino"
                  value={
                    form.destination
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      destination:
                        event
                          .target
                          .value,
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Transportista"
                  value={
                    form.carrier
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      carrier:
                        event
                          .target
                          .value,
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />

                <input
                  required
                  placeholder="Tipo de carga"
                  value={
                    form.cargoType
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      cargoType:
                        event
                          .target
                          .value,
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  min="0"
                  placeholder="Peso (kg)"
                  value={
                    form.weightKg
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      weightKg:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Distancia (km)"
                  value={
                    form.distanceKm
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      distanceKm:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Costo"
                  value={
                    form.cost
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      cost: Number(
                        event
                          .target
                          .value,
                      ),
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={
                    form.shippedDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      shippedDate:
                        event
                          .target
                          .value,
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Dias de entrega"
                  value={
                    form.deliveryDays
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      deliveryDays:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <select
                value={
                  form.status
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    status:
                      event
                        .target
                        .value as ShipmentStatus,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                <option value="En transito">
                  En transito
                </option>
                <option value="Entregado">
                  Entregado
                </option>
                <option value="Retrasado">
                  Retrasado
                </option>
                <option value="Cancelado">
                  Cancelado
                </option>
              </select>

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
