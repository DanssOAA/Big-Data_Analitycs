import {
  BarChart3,
  KeyRound,
  Lock,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

const tips = [
  {
    title: 'Compara contra la competencia',
    text: 'Sube un dataset externo y la IA detecta la brecha frente a tus propios indicadores en minutos.',
  },
  {
    title: 'Patrones que no se ven a simple vista',
    text: 'El analista de IA cruza tus envios, ventas y costos historicos para encontrar tendencias reales.',
  },
  {
    title: 'De datos a plan de accion',
    text: 'Cada analisis entrega causa probable, recomendaciones y un plan de mejora concreto.',
  },
  {
    title: 'Tu historico, tu ventaja',
    text: 'Años de operaciones logisticas se convierten en decisiones estrategicas con un clic.',
  },
  {
    title: 'Todo tu negocio, un solo panel',
    text: 'Clientes, ventas, productos y envios conectados con la inteligencia que los interpreta.',
  },
]

const ROTATE_MS = 5000
const FADE_MS = 300

const barHeights = [
  '38%',
  '62%',
  '48%',
  '82%',
  '58%',
  '70%',
]

export default function LoginShowcase() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)

      window.setTimeout(() => {
        setIndex(
          (current) =>
            (current + 1) % tips.length,
        )
        setVisible(true)
      }, FADE_MS)
    }, ROTATE_MS)

    return () => clearInterval(interval)
  }, [])

  const goTo = (target: number) => {
    if (target === index) {
      return
    }

    setVisible(false)

    window.setTimeout(() => {
      setIndex(target)
      setVisible(true)
    }, FADE_MS)
  }

  const active = tips[index]

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--surface)] px-12 py-12 lg:flex lg:p-16">
      {/* Marca */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <BarChart3 size={20} />
        </div>

        <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          Kargia
        </span>
      </div>

      {/* Ilustracion */}
      <div className="relative mx-auto flex w-full max-w-sm flex-1 items-center justify-center">
        <div
          aria-hidden
          className="absolute h-72 w-72 rounded-full border border-dashed border-[var(--border)]"
        />

        <div
          aria-hidden
          className="absolute -left-6 top-6 h-16 w-16 rounded-full border border-dashed border-[var(--accent)]/30"
        />

        <div
          aria-hidden
          className="absolute -right-4 bottom-10 h-20 w-20 rounded-full border border-dashed border-[var(--accent)]/30"
        />

        {/* Tarjeta central: mini dashboard */}
        <div className="relative z-10 w-64 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-xl shadow-black/5">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-16 rounded-full bg-[var(--accent-soft)]" />
            <div className="h-6 w-6 rounded-full bg-[var(--accent-soft)]" />
          </div>

          <div className="mt-6 flex h-24 items-end gap-2">
            {barHeights.map((height, barIndex) => (
              <div
                key={barIndex}
                className="flex-1 rounded-t-md bg-[var(--accent)]"
                style={{
                  height,
                  opacity:
                    0.45 +
                    barIndex *
                      (0.55 /
                        barHeights.length),
                }}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2.5">
            <Sparkles
              size={14}
              className="shrink-0 text-[var(--accent)]"
            />
            <div className="h-2 w-full rounded-full bg-[var(--accent)]/25" />
          </div>
        </div>

        {/* Insignias flotantes */}
        <div className="absolute -left-8 bottom-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--accent)] shadow-lg shadow-black/5">
          <Lock size={18} />
        </div>

        <div className="absolute -right-6 top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--accent)] shadow-lg shadow-black/5">
          <KeyRound size={18} />
        </div>
      </div>

      {/* Mensaje rotativo */}
      <div className="relative z-10 max-w-sm">
        <div
          className={`transition-all duration-300 ease-out ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Analista de IA
          </p>

          <h2 className="mt-3 text-xl font-semibold leading-snug text-[var(--text-primary)]">
            {active.title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {active.text}
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          {tips.map((tip, tipIndex) => (
            <button
              key={tip.title}
              type="button"
              aria-label={`Ver mensaje ${tipIndex + 1}`}
              onClick={() => goTo(tipIndex)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                tipIndex === index
                  ? 'w-7 bg-[var(--accent)]'
                  : 'w-1.5 bg-[var(--border)] hover:bg-[var(--accent)]/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
