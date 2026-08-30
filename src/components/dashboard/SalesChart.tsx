import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface SalesPoint {
  day: string
  sales: number
}

interface SalesChartProps {
  data: SalesPoint[]
}

export default function SalesChart({
  data,
}: SalesChartProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Rendimiento comercial
        </p>

        <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
          Ventas últimos 30 días
        </h2>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[310px] items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Sin ventas registradas
            </p>

            <p className="mt-2 text-xs text-[var(--text-muted)]">
              El gráfico se generará automáticamente al registrar ventas.
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[310px] w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data}
              margin={{
                top: 12,
                right: 8,
                left: -10,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="salesFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#7c5cff"
                    stopOpacity={0.28}
                  />

                  <stop
                    offset="100%"
                    stopColor="#7c5cff"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="day"
                tick={{
                  fill: 'var(--text-muted)',
                  fontSize: 12,
                }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{
                  fill: 'var(--text-muted)',
                  fontSize: 12,
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `S/${Number(value) / 1000}k`
                }
              />

              <Tooltip
                contentStyle={{
                  background:
                    'var(--surface)',
                  border:
                    '1px solid var(--border)',
                  borderRadius:
                    '12px',
                  color:
                    'var(--text-primary)',
                }}
                formatter={(value) => [
                  `S/ ${Number(
                    value,
                  ).toLocaleString(
                    'es-PE',
                  )}`,
                  'Ventas',
                ]}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#7c5cff"
                strokeWidth={2.5}
                fill="url(#salesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
