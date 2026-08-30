import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  useMemo,
} from 'react'

import {
  parseDateValue,
  parseNumericValue,
} from '../../services/datasetParser.service'

import type {
  DatasetCell,
  DatasetColumn,
  DatasetRecord,
  DatasetTable,
} from '../../types/dataset.types'

interface DatasetDashboardProps {
  dataset: DatasetRecord
  table: DatasetTable
}

interface ColumnSummary {
  key: string
  label: string
  main: string
  secondary: string
  tertiary?: string
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    'es-PE',
    {
      maximumFractionDigits: 2,
    },
  ).format(value)
}

function formatDate(
  timestamp: number,
) {
  return new Intl.DateTimeFormat(
    'es-PE',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(
    new Date(timestamp),
  )
}

function isIdentifierColumn(
  column: DatasetColumn,
) {
  const name =
    `${column.label} ${column.originalLabel}`
      .toLowerCase()

  return /(^|\b)(id|codigo|código|cod|dni|ruc|documento|pedido|nro|numero|número|telefono|teléfono|phone|serie)(\b|_|\.|$)/i.test(
    name,
  )
}

function summarizeColumn(
  column: DatasetColumn,
  values: DatasetCell[],
): ColumnSummary | null {
  const populated =
    values.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== '',
    )

  if (populated.length === 0) {
    return null
  }

  if (
    column.type === 'number'
  ) {
    const numericValues =
      populated
        .map(
          parseNumericValue,
        )
        .filter(
          (
            value,
          ): value is number =>
            value !== null,
        )

    if (
      numericValues.length ===
      0
    ) {
      return null
    }

    if (
      isIdentifierColumn(
        column,
      )
    ) {
      const unique =
        new Set(
          populated.map(
            String,
          ),
        )

      return {
        key: column.key,
        label: column.label,
        main: String(
          populated[0],
        ),
        secondary:
          'Ejemplo de valor',
        tertiary:
          `${unique.size.toLocaleString(
            'es-PE',
          )} valores distintos`,
      }
    }

    const sum =
      numericValues.reduce(
        (
          total,
          value,
        ) =>
          total + value,
        0,
      )

    const average =
      sum /
      numericValues.length

    const minimum =
      Math.min(
        ...numericValues,
      )

    const maximum =
      Math.max(
        ...numericValues,
      )

    return {
      key: column.key,

      label:
        column.label,

      main:
        formatNumber(sum),

      secondary:
        `Promedio ${formatNumber(
          average,
        )}`,

      tertiary:
        `Min ${formatNumber(
          minimum,
        )} · Max ${formatNumber(
          maximum,
        )}`,
    }
  }

  if (
    column.type === 'date'
  ) {
    const dates =
      populated
        .map(
          parseDateValue,
        )
        .filter(
          (
            value,
          ): value is number =>
            value !== null,
        )

    if (
      dates.length === 0
    ) {
      return null
    }

    const earliest =
      Math.min(
        ...dates,
      )

    const latest =
      Math.max(
        ...dates,
      )

    return {
      key: column.key,

      label:
        column.label,

      main:
        formatDate(latest),

      secondary:
        'Fecha más reciente',

      tertiary:
        `Desde ${formatDate(
          earliest,
        )}`,
    }
  }

  if (
    column.type ===
    'boolean'
  ) {
    const positives =
      populated.filter(
        (value) =>
          value === true ||
          String(value)
            .toLowerCase() ===
            'true' ||
          String(value)
            .toLowerCase() ===
            'si' ||
          String(value)
            .toLowerCase() ===
            'sí',
      ).length

    const percentage =
      (
        positives /
        populated.length
      ) * 100

    return {
      key: column.key,

      label:
        column.label,

      main:
        `${percentage.toFixed(
          1,
        )}%`,

      secondary:
        'Valores positivos',

      tertiary:
        `${positives} de ${populated.length}`,
    }
  }

  const frequencies =
    new Map<
      string,
      number
    >()

  for (
    const value
    of populated
  ) {
    const key =
      String(value)

    frequencies.set(
      key,
      (
        frequencies.get(
          key,
        ) ?? 0
      ) + 1,
    )
  }

  const ordered =
    Array.from(
      frequencies.entries(),
    ).sort(
      (a, b) =>
        b[1] - a[1],
    )

  const top =
    ordered[0]

  if (!top) {
    return null
  }

  return {
    key:
      column.key,

    label:
      column.label,

    main:
      top[0],

    secondary:
      `${top[1].toLocaleString(
        'es-PE',
      )} apariciones`,

    tertiary:
      `${frequencies.size.toLocaleString(
        'es-PE',
      )} valores distintos`,
  }
}

export default function DatasetDashboard({
  dataset,
  table,
}: DatasetDashboardProps) {
  const visibleColumns =
    useMemo(
      () =>
        table.columns.filter(
          (column) =>
            column.visible !==
            false,
        ),
      [table.columns],
    )

  const summaries =
    useMemo(
      () =>
        visibleColumns
          .map(
            (column) =>
              summarizeColumn(
                column,

                table.rows.map(
                  (row) =>
                    row[
                      column.key
                    ],
                ),
              ),
          )
          .filter(
            (
              summary,
            ): summary is ColumnSummary =>
              summary !== null,
          )
          .slice(
            0,
            8,
          ),
      [
        visibleColumns,
        table.rows,
      ],
    )

  const numericColumn =
    visibleColumns.find(
      (column) =>
        column.type ===
          'number' &&
        !isIdentifierColumn(
          column,
        ),
    )

  const dateColumn =
    visibleColumns.find(
      (column) =>
        column.type ===
        'date',
    )

  const categoryColumn =
    visibleColumns.find(
      (column) =>
        column.type ===
        'text',
    )

  const chart =
    useMemo(() => {
      if (
        numericColumn &&
        dateColumn
      ) {
        const grouped =
          new Map<
            string,
            {
              timestamp: number
              value: number
            }
          >()

        for (
          const row
          of table.rows
        ) {
          const timestamp =
            parseDateValue(
              row[
                dateColumn.key
              ],
            )

          const value =
            parseNumericValue(
              row[
                numericColumn.key
              ],
            )

          if (
            timestamp ===
              null ||
            value === null
          ) {
            continue
          }

          const day =
            new Date(
              timestamp,
            )
              .toISOString()
              .slice(
                0,
                10,
              )

          const current =
            grouped.get(day)

          grouped.set(
            day,
            {
              timestamp,
              value:
                (
                  current?.value ??
                  0
                ) +
                value,
            },
          )
        }

        const data =
          Array.from(
            grouped.entries(),
          )
            .map(
              ([
                label,
                item,
              ]) => ({
                label,
                timestamp:
                  item.timestamp,
                value:
                  item.value,
              }),
            )
            .sort(
              (a, b) =>
                a.timestamp -
                b.timestamp,
            )
            .slice(
              -40,
            )

        if (
          data.length >=
          2
        ) {
          return {
            type:
              'line' as const,

            title:
              `${numericColumn.label} por ${dateColumn.label}`,

            data,
          }
        }
      }

      if (
        numericColumn &&
        categoryColumn
      ) {
        const grouped =
          new Map<
            string,
            number
          >()

        for (
          const row
          of table.rows
        ) {
          const category =
            row[
              categoryColumn.key
            ]

          const value =
            parseNumericValue(
              row[
                numericColumn.key
              ],
            )

          if (
            category ===
              null ||
            category ===
              undefined ||
            value === null
          ) {
            continue
          }

          const key =
            String(
              category,
            )

          grouped.set(
            key,
            (
              grouped.get(
                key,
              ) ?? 0
            ) +
              value,
          )
        }

        const data =
          Array.from(
            grouped.entries(),
          )
            .map(
              ([
                label,
                value,
              ]) => ({
                label,
                value,
              }),
            )
            .sort(
              (a, b) =>
                b.value -
                a.value,
            )
            .slice(
              0,
              10,
            )

        if (
          data.length >
          0
        ) {
          return {
            type:
              'bar' as const,

            title:
              `${numericColumn.label} por ${categoryColumn.label}`,

            data,
          }
        }
      }

      if (
        categoryColumn
      ) {
        const grouped =
          new Map<
            string,
            number
          >()

        for (
          const row
          of table.rows
        ) {
          const value =
            row[
              categoryColumn.key
            ]

          if (
            value ===
              null ||
            value ===
              undefined
          ) {
            continue
          }

          const key =
            String(value)

          grouped.set(
            key,
            (
              grouped.get(
                key,
              ) ?? 0
            ) + 1,
          )
        }

        const data =
          Array.from(
            grouped.entries(),
          )
            .map(
              ([
                label,
                value,
              ]) => ({
                label,
                value,
              }),
            )
            .sort(
              (a, b) =>
                b.value -
                a.value,
            )
            .slice(
              0,
              10,
            )

        if (
          data.length >
          0
        ) {
          return {
            type:
              'bar' as const,

            title:
              `Distribución de ${categoryColumn.label}`,

            data,
          }
        }
      }

      // Respaldo 1: si solo existen métricas numéricas, se muestra su
      // comportamiento por posición de fila en lugar de descartar el gráfico.
      if (numericColumn) {
        const data = table.rows
          .map((row, index) => ({
            label: `Fila ${index + 1}`,
            value: parseNumericValue(row[numericColumn.key]),
          }))
          .filter((item): item is { label: string; value: number } => item.value !== null)
          .slice(0, 40)

        if (data.length > 0) {
          return {
            type: 'line' as const,
            title: `Evolución de ${numericColumn.label} por fila`,
            data,
          }
        }
      }

      // Respaldo 2: funciona con fechas, booleanos, identificadores o texto
      // aunque el tipo inferido no haya producido una combinación ideal.
      const fallbackColumn = visibleColumns.find((column) =>
        table.rows.some((row) => {
          const value = row[column.key]
          return value !== null && value !== undefined && String(value).trim() !== ''
        }),
      )

      if (fallbackColumn) {
        const frequencies = new Map<string, number>()

        table.rows.forEach((row) => {
          const value = row[fallbackColumn.key]
          if (value === null || value === undefined || String(value).trim() === '') return
          const label = String(value)
          frequencies.set(label, (frequencies.get(label) ?? 0) + 1)
        })

        const data = Array.from(frequencies.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)

        if (data.length > 0) {
          return {
            type: 'bar' as const,
            title: `Frecuencia de ${fallbackColumn.label}`,
            data,
          }
        }
      }

      // Último respaldo: incluso un archivo sin valores aprovechables puede
      // representar la cantidad de registros que se logró procesar.
      if (table.rows.length > 0) {
        return {
          type: 'bar' as const,
          title: 'Registros procesados',
          data: [{ label: 'Filas', value: table.rows.length }],
        }
      }

      return null
    }, [
      categoryColumn,
      dateColumn,
      numericColumn,
      table.rows,
      visibleColumns,
    ])

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Resumen automático
        </h3>

        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Información calculada directamente desde los valores del dataset.
        </p>

        {summaries.length >
        0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaries.map(
              (summary) => (
                <article
                  key={
                    summary.key
                  }
                  className="min-w-0 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5"
                >
                  <p
                    title={
                      summary.label
                    }
                    className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    {
                      summary.label
                    }
                  </p>

                  <p
                    title={
                      summary.main
                    }
                    className="mt-4 truncate text-xl font-semibold text-[var(--text-primary)]"
                  >
                    {
                      summary.main
                    }
                  </p>

                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {
                      summary.secondary
                    }
                  </p>

                  {summary.tertiary && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {
                        summary.tertiary
                      }
                    </p>
                  )}
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
            No se encontraron columnas con datos suficientes para generar indicadores.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Visualización
        </h3>

        <p className="mt-1 text-xs text-[var(--text-muted)]">
          El gráfico se selecciona según las columnas disponibles.
        </p>

        {chart ? (
          <>
            <p className="mt-6 text-sm font-medium text-[var(--text-secondary)]">
              {chart.title}
            </p>

            <div className="mt-5 h-[380px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                {chart.type ===
                'line' ? (
                  <LineChart
                    data={
                      chart.data
                    }
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="4 4"
                      vertical={
                        false
                      }
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: 'var(--text-muted)',
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                    />

                    <YAxis
                      tick={{
                        fill: 'var(--text-muted)',
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#6d5dfc"
                      strokeWidth={
                        2.5
                      }
                      dot={
                        false
                      }
                    />
                  </LineChart>
                ) : (
                  <BarChart
                    data={
                      chart.data
                    }
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="4 4"
                      vertical={
                        false
                      }
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: 'var(--text-muted)',
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                      tickFormatter={(
                        value,
                      ) => {
                        const text =
                          String(
                            value,
                          )

                        return text.length >
                          14
                          ? `${text.slice(
                              0,
                              14,
                            )}...`
                          : text
                      }}
                    />

                    <YAxis
                      tick={{
                        fill: 'var(--text-muted)',
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="#6d5dfc"
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No existe una combinación adecuada de columnas para generar un gráfico.
            </p>
          </div>
        )}

        <p className="mt-4 text-[10px] text-[var(--text-muted)]">
          Fuente: {dataset.name}
        </p>
      </section>
    </div>
  )
}
