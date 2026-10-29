# Maxify · Backend

API REST de Maxify hecha con **NestJS 11**, **Mongoose 8** y **MongoDB**.
La arquitectura, los endpoints y las decisiones están en el [README principal](../README.md).

## Scripts

```bash
npm install
cp .env.example .env    # completar las variables
npm run start:dev       # desarrollo con recarga (http://localhost:3000)
npm run build           # compila a dist/
npm run start:prod      # ejecuta dist/main (lo usa Render)
npm run lint
npm test
```

Requiere **Node 22 o superior** (usa `process.loadEnvFile`).
