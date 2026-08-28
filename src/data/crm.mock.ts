export const crmMetrics = {
  totalSales30Days: 128450,
  averageTicket: 2840.25,
  topProduct: {
    name: 'Producto Alpha',
    units: 438,
  },
}

export const salesTrend = [
  { day: '01 Ago', sales: 11200 },
  { day: '05 Ago', sales: 15800 },
  { day: '09 Ago', sales: 13400 },
  { day: '13 Ago', sales: 19200 },
  { day: '17 Ago', sales: 17500 },
  { day: '21 Ago', sales: 23800 },
  { day: '25 Ago', sales: 27550 },
]

export const recentActivities = [
  {
    id: 1,
    title: 'Venta cerrada con Constructora Norte',
    description: 'Producto Alpha - S/ 12,850',
    time: 'Hace 18 minutos',
    type: 'sale',
  },
  {
    id: 2,
    title: 'Seguimiento realizado',
    description: 'Comercial Andina SAC',
    time: 'Hace 1 hora',
    type: 'activity',
  },
  {
    id: 3,
    title: 'Nuevo cliente registrado',
    description: 'Corporacion Metalica Peru',
    time: 'Hace 3 horas',
    type: 'client',
  },
  {
    id: 4,
    title: 'Venta en negociacion',
    description: 'Industrias del Pacifico - S/ 8,400',
    time: 'Hace 5 horas',
    type: 'sale',
  },
]

export const clientsMock = [
  {
    id: 'CLI-001',
    name: 'Carlos Mendoza',
    company: 'Constructora Norte',
    email: 'c.mendoza@constructora.pe',
    status: 'Activo',
    lastContact: '27/08/2026',
    totalSales: 28500,
  },
  {
    id: 'CLI-002',
    name: 'Ana Torres',
    company: 'Comercial Andina SAC',
    email: 'atorres@andina.pe',
    status: 'Activo',
    lastContact: '26/08/2026',
    totalSales: 18200,
  },
  {
    id: 'CLI-003',
    name: 'Luis Ramirez',
    company: 'Industrias del Pacifico',
    email: 'lramirez@ipacifico.pe',
    status: 'Prospecto',
    lastContact: '26/08/2026',
    totalSales: 8400,
  },
  {
    id: 'CLI-004',
    name: 'Maria Salazar',
    company: 'Corporacion Metalica Peru',
    email: 'msalazar@metalica.pe',
    status: 'Activo',
    lastContact: '25/08/2026',
    totalSales: 35600,
  },
  {
    id: 'CLI-005',
    name: 'Diego Castro',
    company: 'Grupo Industrial Lima',
    email: 'dcastro@gilima.pe',
    status: 'Inactivo',
    lastContact: '19/08/2026',
    totalSales: 12600,
  },
]

export const salesMock = [
  {
    id: 'VTA-1048',
    client: 'Constructora Norte',
    product: 'Producto Alpha',
    amount: 12850,
    date: '27/08/2026',
    status: 'Completada',
  },
  {
    id: 'VTA-1047',
    client: 'Corporacion Metalica Peru',
    product: 'Producto Beta',
    amount: 9200,
    date: '26/08/2026',
    status: 'Completada',
  },
  {
    id: 'VTA-1046',
    client: 'Industrias del Pacifico',
    product: 'Producto Alpha',
    amount: 8400,
    date: '26/08/2026',
    status: 'Negociacion',
  },
  {
    id: 'VTA-1045',
    client: 'Comercial Andina SAC',
    product: 'Producto Gamma',
    amount: 6750,
    date: '25/08/2026',
    status: 'Completada',
  },
]

export const activitiesMock = [
  {
    id: 'ACT-001',
    type: 'Llamada',
    client: 'Constructora Norte',
    description: 'Seguimiento posterior a la compra de Producto Alpha.',
    date: '27 Ago, 10:30',
  },
  {
    id: 'ACT-002',
    type: 'Reunion',
    client: 'Industrias del Pacifico',
    description: 'Presentacion de propuesta comercial y condiciones.',
    date: '27 Ago, 09:00',
  },
  {
    id: 'ACT-003',
    type: 'Correo',
    client: 'Comercial Andina SAC',
    description: 'Envio de cotizacion actualizada.',
    date: '26 Ago, 16:45',
  },
]
