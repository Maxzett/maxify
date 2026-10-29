# Maxify · Frontend

SPA de Maxify hecha con **Angular 21** (componentes standalone y signals) y **Angular Material** con un tema propio.
La arquitectura y las decisiones están en el [README principal](../README.md).

## Scripts

```bash
npm install
npm start          # http://localhost:4200 (usa la API en http://localhost:3000)
npm run build      # build de producción en dist/frontend/browser
npm test           # tests unitarios con Vitest
```

La URL de la API se define en `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (producción; el build de producción la reemplaza con `fileReplacements`).
