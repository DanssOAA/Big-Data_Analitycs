// Genera un CSV historico de logistica con 3 tablas
// (separadas por lineas en blanco) para probar el modulo de
// Datasets + el analista de IA con un volumen realista de datos.
const fs = require('fs')
const path = require('path')

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)]
}

function pickWeighted(pairs) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0)
  let roll = Math.random() * total
  for (const [value, weight] of pairs) {
    roll -= weight
    if (roll <= 0) return value
  }
  return pairs[pairs.length - 1][0]
}

function fmtDate(date) {
  return date.toISOString().slice(0, 10)
}

function round2(value) {
  return Math.round(value * 100) / 100
}

const cities = [
  'Lima',
  'Arequipa',
  'Trujillo',
  'Chiclayo',
  'Piura',
  'Cusco',
  'Iquitos',
  'Huancayo',
  'Tacna',
  'Ica',
]

// Distancias aproximadas desde Lima (km), usadas para estimar
// distancia entre dos ciudades cualquiera de forma plausible.
const distanceFromLima = {
  Lima: 0,
  Arequipa: 1010,
  Trujillo: 560,
  Chiclayo: 770,
  Piura: 990,
  Cusco: 1100,
  Iquitos: 1030,
  Huancayo: 300,
  Tacna: 1290,
  Ica: 300,
}

function distanceBetween(a, b) {
  if (a === b) return randInt(15, 60)
  const base = Math.abs(distanceFromLima[a] - distanceFromLima[b]) +
    Math.min(distanceFromLima[a], distanceFromLima[b]) * 0.35
  return Math.max(80, Math.round(base + rand(-60, 60)))
}

const carriers = [
  'Kargia Flota Norte',
  'Transportes Andina SAC',
  'Logistica Rapida SAC',
  'Envios del Sur EIRL',
  'TransPeru Cargo',
  'Rutas Continentales SAC',
]

const cargoTypes = [
  'Carga general',
  'Refrigerado',
  'Perecibles',
  'Materiales de construccion',
  'Electrodomesticos',
  'Textiles',
  'Maquinaria industrial',
  'Documentos y paqueteria',
]

const clients = [
  'Constructora Norte',
  'Comercial Andina SAC',
  'Industrias del Pacifico',
  'Corporacion Metalica Peru',
  'Grupo Industrial Lima',
  'Distribuidora Central',
  'Agroexportadora del Valle',
  'Textiles Peruanos SAC',
  'Minera Altiplano',
  'Farmaceutica Nacional',
]

const START_YEAR = 2022
const END_DATE = new Date(Date.UTC(2026, 7, 31))
const START_DATE = new Date(Date.UTC(START_YEAR, 0, 1))

const rows = []
let guiaCounter = 1000

for (
  let date = new Date(START_DATE);
  date <= END_DATE;
  date.setUTCDate(date.getUTCDate() + 1)
) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()

  // Estacionalidad: mas envios en campana (nov-dic) y menos en
  // temporada baja (feb), mas crecimiento año a año.
  const seasonality = [month === 10 || month === 11 ? 1.4 : 1, month === 1 ? 0.75 : 1]
    .reduce((a, b) => a * b, 1)
  const growth = 1 + (year - START_YEAR) * 0.12
  const shipmentsToday = Math.max(
    0,
    Math.round(rand(3, 9) * seasonality * growth),
  )

  for (let i = 0; i < shipmentsToday; i += 1) {
    const origin = pick(cities)
    let destination = pick(cities)
    while (destination === origin && Math.random() > 0.15) {
      destination = pick(cities)
    }

    const distanceKm = distanceBetween(origin, destination)
    const weightKg = round2(rand(40, 4800))
    const carrier = pick(carriers)
    const cargoType = pick(cargoTypes)
    const client = pick(clients)

    const baseCostPerKm = rand(2.2, 4.5) * (1 + (year - START_YEAR) * 0.06)
    const cost = round2(
      distanceKm * baseCostPerKm * 0.35 + weightKg * rand(0.35, 0.9),
    )

    const baseDays = Math.max(1, Math.round(distanceKm / 420))
    const status = pickWeighted([
      ['Entregado', 84],
      ['En transito', 8],
      ['Retrasado', 6],
      ['Cancelado', 2],
    ])

    const deliveryDays =
      status === 'Retrasado'
        ? baseDays + randInt(2, 5)
        : Math.max(1, baseDays + randInt(-1, 1))

    guiaCounter += 1

    rows.push([
      fmtDate(date),
      year,
      `GUI-${guiaCounter}`,
      client,
      origin,
      destination,
      cargoType,
      weightKg,
      distanceKm,
      carrier,
      cost,
      deliveryDays,
      status,
    ])
  }
}

const table1Header = [
  'Fecha',
  'Anio',
  'Guia',
  'Cliente',
  'Origen',
  'Destino',
  'Tipo_Carga',
  'Peso_kg',
  'Distancia_km',
  'Transportista',
  'Costo_Flete',
  'Dias_Entrega',
  'Estado',
]

// Tabla 2: resumen de rutas
const routeMap = new Map()
for (const row of rows) {
  const [, , , , origin, destination, , , distanceKm, carrier, cost] = row
  const key = `${origin}|${destination}`
  const current = routeMap.get(key) ?? {
    origin,
    destination,
    distanceKm,
    carrierCounts: new Map(),
    totalCost: 0,
    count: 0,
  }
  current.totalCost += cost
  current.count += 1
  current.carrierCounts.set(
    carrier,
    (current.carrierCounts.get(carrier) ?? 0) + 1,
  )
  routeMap.set(key, current)
}

const table2Header = [
  'Ruta',
  'Origen',
  'Destino',
  'Distancia_km',
  'Transportista_Principal',
  'Costo_Promedio',
  'Envios_Historicos',
]

const table2Rows = Array.from(routeMap.values()).map((route) => {
  let mainCarrier = ''
  let mainCount = -1
  for (const [carrier, count] of route.carrierCounts) {
    if (count > mainCount) {
      mainCarrier = carrier
      mainCount = count
    }
  }

  return [
    `${route.origin} - ${route.destination}`,
    route.origin,
    route.destination,
    route.distanceKm,
    mainCarrier,
    round2(route.totalCost / route.count),
    route.count,
  ]
})

// Tabla 3: directorio de transportistas
const carrierMap = new Map()
for (const row of rows) {
  const carrier = row[9]
  const cost = row[10]
  const current = carrierMap.get(carrier) ?? { count: 0, totalCost: 0 }
  current.count += 1
  current.totalCost += cost
  carrierMap.set(carrier, current)
}

const table3Header = [
  'Transportista',
  'Flota_Vehiculos',
  'Cobertura',
  'Anios_Operando',
  'Envios_Totales',
  'Costo_Promedio',
]

const table3Rows = Array.from(carrierMap.entries()).map(
  ([carrier, stats], index) => [
    carrier,
    randInt(8, 60),
    pick(['Nacional', 'Costa y Sierra', 'Costa', 'Nacional e internacional']),
    randInt(3, 18),
    stats.count,
    round2(stats.totalCost / stats.count),
  ],
)

function toCsvLine(values) {
  return values
    .map((value) => {
      const text = String(value)
      return text.includes(',') ? `"${text}"` : text
    })
    .join(',')
}

const lines = []
lines.push(toCsvLine(table1Header))
for (const row of rows) lines.push(toCsvLine(row))
lines.push('')
lines.push(toCsvLine(table2Header))
for (const row of table2Rows) lines.push(toCsvLine(row))
lines.push('')
lines.push(toCsvLine(table3Header))
for (const row of table3Rows) lines.push(toCsvLine(row))

const outPath = path.join(
  __dirname,
  'kargia_historico_logistica.csv',
)

fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

console.log(`Filas Envios: ${rows.length}`)
console.log(`Filas Rutas: ${table2Rows.length}`)
console.log(`Filas Transportistas: ${table3Rows.length}`)
console.log(`Archivo: ${outPath}`)
console.log(
  `Tamano: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`,
)
