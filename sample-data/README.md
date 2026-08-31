# Dataset historico de ejemplo

`kargia_historico_logistica.csv` es un dataset sintetico (generado con
`generate.cjs`) pensado para probar el modulo de Insights + el
analista de IA con un volumen de datos realista.

Contiene 3 tablas separadas por lineas en blanco (el parser de la
app las detecta automaticamente como pestañas):

1. **Envios** (~12,800 filas) — historico dia a dia de envios entre
   2022-01-01 y 2026-08-31: fecha, cliente, origen/destino,
   transportista, tipo de carga, peso, distancia, costo, dias de
   entrega y estado.
2. **Rutas** (100 filas) — resumen por ruta origen-destino.
3. **Transportistas** (6 filas) — directorio de transportistas con
   flota, cobertura y costo promedio.

## Como usarlo

1. Inicia sesion como administrador.
2. Ve a **Dashboard** (boton "Carga masiva de datos") o a
   **Datasets** → "Crear dataset".
3. Selecciona `kargia_historico_logistica.csv`.
4. Marcalo como **"Mis datos"** (toggle en la tarjeta del dataset) si
   quieres usarlo como el lado interno de una comparacion IA contra
   otro dataset (por ejemplo, uno de la competencia).

## Regenerarlo

```powershell
cd sample-data
node generate.cjs
```
