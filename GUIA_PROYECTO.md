# CRM Insights

Sistema CRM con modulo de inteligencia estrategica desarrollado con React.

El proyecto contempla dos roles principales:

- Administrador
- Trabajador

El Trabajador utiliza las funcionalidades principales del CRM.

El Administrador tiene acceso adicional a un modulo de Insights que permite cargar archivos CSV, visualizar su informacion, generar analisis mediante Inteligencia Artificial y comparar los resultados externos con las metricas internas de la empresa.

---

# 1. Objetivo del proyecto

Construir una aplicacion web que combine:

- CRM basico.
- Gestion de clientes.
- Registro de ventas.
- Registro de actividades.
- Dashboard comercial.
- Gestion de archivos CSV.
- Visualizacion tipo Excel.
- Analisis de datasets externos.
- Comparacion con informacion interna del CRM.
- Generacion de recomendaciones mediante IA.

El desarrollo se esta realizando inicialmente solo en frontend.

Posteriormente se integrara:

- Supabase Authentication.
- Supabase PostgreSQL.
- Supabase Storage.
- Inteligencia Artificial.
- Persistencia de archivos CSV.
- Generacion y almacenamiento de Insights.

---

# 2. Roles

## Trabajador

El trabajador puede acceder a:

- Dashboard.
- Clientes.
- Ventas.
- Actividades.
- Insights Estrategicos publicados por el administrador.

El trabajador NO puede:

- Subir archivos CSV.
- Crear carpetas de datasets.
- Generar analisis.
- Modificar analisis.
- Publicar Insights.
- Administrar usuarios.

---

## Administrador

El administrador puede acceder a:

- Dashboard.
- Clientes.
- Ventas.
- Actividades.
- Insights.
- Explorador de datasets.
- Gestion de carpetas.
- Carga de CSV.
- Visualizacion de CSV.
- Generacion de analisis.
- Comparacion contra el CRM.
- Publicacion de Insights.
- Administracion de usuarios.

---

# 3. Metricas principales del CRM

Inicialmente el sistema trabajara con tres metricas.

## Total de ventas

Suma de las ventas realizadas durante los ultimos 30 dias.

Ejemplo:

```text
S/ 128,450.00
```

---

## Ticket promedio

Promedio monetario de las ventas realizadas.

Formula:

```text
Ticket promedio = Total ventas / Cantidad de ventas
```

Ejemplo:

```text
S/ 2,840.25
```

---

## Producto mas vendido

Producto con mayor cantidad de unidades vendidas durante el ultimo mes.

Ejemplo:

```text
Producto Alpha
438 unidades
```

Estas tres metricas se utilizaran posteriormente como informacion interna de la empresa para realizar comparaciones mediante Inteligencia Artificial.

---

# 4. Flujo de Insights

El flujo del administrador sera:

```text
Crear carpeta
      |
      v
Subir CSV
      |
      v
Procesar archivo
      |
      v
Detectar tablas
      |
      v
Visualizar informacion
      |
      v
Generar Insight
      |
      v
Comparar CSV contra CRM
      |
      v
Generar recomendaciones IA
      |
      v
Guardar analisis
      |
      v
Publicar para trabajadores
```

---

# 5. Gestion de archivos CSV

Cada archivo CSV aparecera dentro del sistema mediante una Card.

La Card mostrara informacion como:

- Nombre del archivo.
- Fecha de carga.
- Cantidad de filas.
- Cantidad de columnas.
- Numero de tablas detectadas.
- Vista previa de registros.

Ejemplo:

```text
ventas_competencia.csv

1,243 filas
8 columnas
2 tablas detectadas

Fecha:
27/08/2026
```

---

# 6. CSV con varias tablas

Tecnicamente un CSV representa una estructura tabular.

Sin embargo, para este proyecto se contempla que un archivo pueda contener diferentes bloques de informacion.

Ejemplo:

```text
Producto,Precio,Ventas
A,100,20
B,200,30


Region,Ventas
Lima,5000
Arequipa,3000
```

El sistema podra interpretar las filas vacias como separadores.

Esto permitiria detectar:

```text
Tabla 1
Ventas por producto

Tabla 2
Ventas por region
```

En el frontend cada bloque se mostrara mediante pestañas.

Ejemplo:

```text
[ Ventas por producto ] [ Ventas por region ]
```

---

# 7. Visualizador tipo Excel

Los datasets se visualizaran utilizando un Data Grid.

Inicialmente se utilizara:

```text
AG Grid Community
```

Permitira funcionalidades como:

- Mostrar filas y columnas.
- Ordenar.
- Buscar.
- Filtrar.
- Navegar por gran cantidad de registros.

Posteriormente se evaluara si tambien sera necesario permitir edicion directa de las celdas.

---

# 8. Inteligencia Artificial

El analisis no se realizara automaticamente.

El administrador tendra un boton:

```text
Comparar con mi CRM y generar Insight
```

Cuando se implemente la IA, el sistema enviara aproximadamente la siguiente informacion:

```text
Datos CRM:

Total ventas:
S/ 128,450

Ticket promedio:
S/ 2,840

Producto mas vendido:
Producto Alpha


Datos externos:

Contenido procesado desde el CSV.
```

La IA tendra que producir:

- Brecha.
- Causa probable.
- Recomendaciones.
- Comparacion de indicadores.
- Conclusion estrategica.

---

# 9. Tecnologias

Frontend:

```text
React
TypeScript
Vite
Tailwind CSS
React Router
Lucide React
Recharts
Papa Parse
AG Grid
```

Backend / datos futuros:

```text
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Supabase Edge Functions
```

Inteligencia Artificial futura:

```text
OpenAI
Gemini
Claude
```

Se seleccionara posteriormente el proveedor definitivo.

---

# 10. Requisitos del entorno

Se recomienda utilizar:

```text
Node.js 22 LTS
npm
Git
Visual Studio Code
```

Comprobar Node:

```powershell
node --version
```

Comprobar npm:

```powershell
npm --version
```

Comprobar Git:

```powershell
git --version
```

---

# 11. Crear proyecto desde cero

Ejecutar:

```powershell
npm create vite@latest crm-insights -- --template react-ts
```

Entrar al proyecto:

```powershell
cd crm-insights
```

Instalar dependencias iniciales:

```powershell
npm install
```

---

# 12. Instalar dependencias del proyecto

Ejecutar:

```powershell
npm install react-router lucide-react recharts papaparse ag-grid-react
```

Instalar tipos para Papa Parse:

```powershell
npm install -D @types/papaparse
```

Instalar Tailwind CSS:

```powershell
npm install tailwindcss @tailwindcss/vite
```

---

# 13. Configurar Vite

El archivo:

```text
vite.config.ts
```

debe contener:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

---

# 14. Configurar Tailwind y estilos globales

El archivo principal de estilos es:

```text
src/index.css
```

La identidad visual utiliza una paleta Dark Premium.

Principales colores:

```text
Background       #07090d
Sidebar          #0a0d12
Surface          #0f131a
Surface Hover    #151a23
Border           #232a35

Texto principal  #f5f7fa
Texto secundario #9ca8b8
Texto muted      #667085

Accent           #7c5cff
Success          #34d399
Warning          #fbbf24
Danger           #fb7185
```

---

# 15. Estructura del proyecto

La estructura inicial utilizada es:

```text
src/
|
|-- components/
|   |
|   |-- common/
|   |-- layout/
|   |-- dashboard/
|   |-- crm/
|   `-- insights/
|
|-- pages/
|   |
|   |-- auth/
|   |-- worker/
|   |-- crm/
|   |-- admin/
|   `-- insights/
|
|-- data/
|
|-- hooks/
|
|-- services/
|
|-- types/
|
|-- routes/
|
|-- context/
|
|-- App.tsx
|-- main.tsx
`-- index.css
```

No se debe desarrollar toda la aplicacion dentro de:

```text
App.tsx
```

Cada modulo debe permanecer separado en componentes y paginas.

---

# 16. Rutas planificadas

Rutas generales:

```text
/login

/app/dashboard

/app/clientes

/app/ventas

/app/actividades

/app/insights
```

Rutas exclusivas del administrador:

```text
/admin/insights

/admin/insights/carpetas/:folderId

/admin/insights/archivos/:fileId

/admin/insights/analisis/:analysisId

/admin/usuarios
```

---

# 17. Diseño visual

La interfaz utilizara estilo:

```text
Dark Premium
```

Caracteristicas:

- Fondo oscuro graphite / obsidian.
- Cards elevadas.
- Bordes finos.
- Tipografia limpia.
- Iconos lineales.
- Acento violeta.
- Graficos minimalistas.
- Sidebar oscura.
- Layout estilo SaaS.
- Poco uso de degradados.
- Estados de hover suaves.
- Interfaces responsivas.

---

# 18. Etapas de desarrollo

## Etapa 1 - Frontend base

- Configuracion React.
- TypeScript.
- Tailwind.
- Paleta Dark Premium.
- Estructura de carpetas.

Estado:

```text
EN DESARROLLO
```

---

## Etapa 2 - Autenticacion simulada

Crear:

- Login.
- Usuario Admin mock.
- Usuario Trabajador mock.
- Contexto de autenticacion.
- Proteccion visual por roles.

Sin Supabase todavia.

---

## Etapa 3 - Layout

Crear:

- Sidebar.
- Topbar.
- AppLayout.
- Navegacion responsive.
- Menu distinto para Admin y Trabajador.

---

## Etapa 4 - Dashboard CRM

Crear las tarjetas:

```text
Ventas ultimos 30 dias
Ticket promedio
Producto mas vendido
```

Agregar:

- Grafico de ventas.
- Actividad reciente.
- Resumen comercial.

Los datos inicialmente seran Mock.

---

## Etapa 5 - CRM

Crear:

- Clientes.
- Ventas.
- Actividades.

Datos inicialmente simulados.

---

## Etapa 6 - Insights Admin

Crear:

- Explorador.
- Carpetas.
- Cards de archivos.
- Subida de CSV.
- Vista previa.

---

## Etapa 7 - Procesamiento CSV

Utilizar:

```text
Papa Parse
```

Funciones:

- Seleccionar CSV.
- Leer CSV en navegador.
- Convertir CSV a objetos JavaScript.
- Detectar columnas.
- Detectar registros.
- Detectar posibles bloques separados.

---

## Etapa 8 - Data Grid

Utilizar:

```text
AG Grid
```

Funciones:

- Visualizacion de datos.
- Ordenamiento.
- Filtros.
- Busqueda.
- Columnas dinamicas.

---

## Etapa 9 - Analisis simulado

Antes de implementar IA real se crearan respuestas Mock.

El sistema simulara:

- Gap.
- Causa.
- Recomendaciones.
- Impacto.
- Comparacion CRM vs dataset.

---

## Etapa 10 - Compartir Insights

El Admin podra indicar:

```text
Visible para trabajadores
```

Los trabajadores solamente podran visualizar los Insights publicados.

---

## Etapa 11 - Supabase

Una vez terminado el frontend se conectara:

```text
Supabase Auth
PostgreSQL
Storage
```

Tablas previstas:

```text
carpetas
archivos_csv
tablas_csv
datos_csv
analisis_ia
metricas_crm
usuarios
clientes
ventas
actividades
```

---

# 19. Variables de entorno

Nunca colocar secretos directamente dentro del codigo React.

Crear localmente:

```text
.env
```

Ejemplo:

```text
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxx
```

El archivo:

```text
.env
```

NO debe subirse al repositorio.

El repositorio incluye solamente:

```text
.env.example
```

---

# 20. Levantar el proyecto

Después de clonar el repositorio ejecutar:

```powershell
npm install
```

Después:

```powershell
npm run dev
```

Vite mostrara una direccion similar a:

```text
http://localhost:5173
```

Abrir esa direccion en el navegador.

---

# 21. Clonar proyecto en otra computadora

Clonar:

```powershell
git clone URL_DEL_REPOSITORIO
```

Entrar:

```powershell
cd crm-insights
```

Instalar paquetes:

```powershell
npm install
```

Crear las variables locales cuando sean necesarias:

```powershell
Copy-Item ".env.example" ".env"
```

Ejecutar:

```powershell
npm run dev
```

---

# 22. Buenas practicas Git

No subir:

```text
node_modules
.env
dist
credenciales
API Keys
certificados
CSV empresariales privados
```

Si subir:

```text
src/
public/
package.json
package-lock.json
vite.config.ts
tsconfig.json
.gitignore
.env.example
documentacion
```

Es MUY importante subir:

```text
package-lock.json
```

para que todos los desarrolladores utilicen versiones consistentes de las dependencias.

---

# 23. Flujo recomendado de Git

Consultar cambios:

```powershell
git status
```

Agregar cambios:

```powershell
git add .
```

Crear commit:

```powershell
git commit -m "feat: configurar frontend CRM Insights"
```

Subir:

```powershell
git push
```

---

# 24. Estado actual

Actualmente estamos construyendo:

```text
FRONTEND
```

Todavia NO estamos implementando:

```text
Supabase real
Base de datos real
Login real
IA real
OpenAI
Gemini
Claude
```

Durante esta fase todos esos servicios seran simulados mediante datos Mock.

Esto permite terminar primero:

- Diseño.
- Navegacion.
- Experiencia de usuario.
- CRM.
- CSV.
- Insights.
- Comparaciones.

Despues se sustituiran progresivamente los Mocks por Supabase y servicios reales.

---

# 25. Siguiente paso

La siguiente fase del desarrollo sera:

```text
Login Dark Premium
        |
        v
Autenticacion Mock
        |
        v
Admin / Trabajador
        |
        v
App Layout
        |
        v
Sidebar
        |
        v
Dashboard CRM
```

Posteriormente se desarrollara el modulo de CRM y finalmente el explorador de Insights.
