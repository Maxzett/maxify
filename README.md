# Maxify · Red social

Trabajo Práctico N.º 2 de **Programación IV** (UTN Avellaneda).
Maxify es una red social donde los usuarios publican, reaccionan con "me gusta" y comentan.

| Pieza | Tecnología | Hosting |
|---|---|---|
| Frontend | Angular 21 (standalone, signals) + Angular Material | Vercel |
| Backend | NestJS 11 + Mongoose 8 | Render |
| Base de datos | MongoDB | MongoDB Atlas (M0) |
| Imágenes | Cloudinary | — |

> **URLs de producción**
> - Frontend: [https://maxify-ten.vercel.app](https://maxify-ten.vercel.app)
> - API: [https://maxify.onrender.com](https://maxify.onrender.com)

---

## Arquitectura

```
┌──────────────────────┐        HTTPS + JSON       ┌──────────────────────┐        ┌────────────────┐
│  Angular (SPA)       │ ────────────────────────▶ │   NestJS (API REST)  │ ─────▶ │ MongoDB Atlas  │
│  Vercel              │ ◀──────────────────────── │   Render             │        └────────────────┘
└──────────────────────┘                           └──────────┬───────────┘
                                                              │ subida de imágenes
                                                              ▼
                                                      ┌────────────────┐
                                                      │   Cloudinary   │
                                                      └────────────────┘
```

Es un **monorepo con dos proyectos independientes**, cada uno con su `package.json`:

```
/
├── backend/     API REST (NestJS)
├── frontend/    SPA (Angular)
└── render.yaml  Blueprint de Render para el backend
```

### Backend (`/backend`)

```
src/
├── main.ts                 ValidationPipe global + CORS (FRONTEND_ORIGIN)
├── app.module.ts           Carga el .env con loadEnvFile y conecta Mongo
├── auth/                   Registro y login (bcrypt + JWT)
│   ├── dto/                RegistroDto, LoginDto (class-validator)
│   ├── jwt-auth.guard.ts   Guard global: exige el token en todas las rutas
│   ├── publico.decorator.ts        @Publico() para login, registro y health check
│   └── usuario-actual.decorator.ts @UsuarioActual() lee el usuario del token
├── usuarios/               Esquema Usuario + UsuariosService (presentar())
├── publicaciones/          Publicaciones, me gusta y (lectura de) comentarios
│   ├── dto/                CrearPublicacionDto, ListarPublicacionesDto
│   ├── publicacion.schema.ts   titulo, mensaje, imagen, autor, likesCount, eliminada
│   ├── like.schema.ts          un documento por "me gusta" (índice único)
│   └── comentario.schema.ts    esquema mínimo (el controller llega en el Sprint 3)
└── imagenes/               ImagenesService: Multer → Sharp (WebP) → Cloudinary
```

**Endpoints del Sprint 1**

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/auth/registro` (multipart, campo `foto` opcional) | **201** `{ token, usuario }` · 400 datos inválidos · 409 correo o usuario repetido |
| `POST` | `/auth/login` (`{ identificador, password }`) | **200** `{ token, usuario }` · 400 datos faltantes · 401 credenciales incorrectas · 403 cuenta deshabilitada |
| `GET` | `/` | **200** estado de la API (health check de Render) |

`identificador` puede ser el **correo o el nombre de usuario** (los dos son únicos).
La respuesta nunca incluye la contraseña ni el `_id` crudo de Mongo.

**Endpoints del Sprint 2** (todos con `Authorization: Bearer <token>`; sin token o con token vencido → **401**)

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/publicaciones` (multipart: `titulo`, `mensaje`, archivo `imagen` opcional) | **201** la publicación creada a nombre del usuario del token · 400 datos o imagen inválidos |
| `GET` | `/publicaciones?orden=fecha\|likes&usuario=<id>&offset=0&limit=5` | **200** `{ publicaciones, total }` · 400 parámetros inválidos |
| `DELETE` | `/publicaciones/:id` | **204** baja lógica · 403 no es el autor ni administrador · 404 no existe |
| `POST` | `/publicaciones/:id/like` | **201** `{ likesCount, meGusta: true }` · 404 no existe · 409 ya le había dado me gusta |
| `DELETE` | `/publicaciones/:id/like` | **200** `{ likesCount, meGusta: false }` · 404 no le había dado me gusta |

- `orden` por defecto es `fecha` (más nuevas primero); con `likes` ordena por cantidad de me gusta y desempata por fecha.
- `limit` va de 1 a 20 (por defecto 5) y `offset` indica cuántas saltear: el front pide `offset` = las que ya tiene.
- Cada publicación trae `meGusta` (si el usuario del token le dio me gusta) y `comentariosCount`.
- `comentarios=N` (0 a 10) agrega a cada publicación sus últimos N comentarios. Lo usa Mi perfil.

### Frontend (`/frontend`)

```
src/app/
├── core/
│   ├── models/             Interfaces Usuario, Sesion, Publicacion
│   ├── interceptors/       authInterceptor (token en cada pedido, 401 → login)
│   ├── services/           AuthService, PublicacionesService, NotificacionesService
│   └── validators/         passwordSegura, passwordsIguales, edadMinima, errorDeImagen
├── features/
│   ├── auth/login/         Login (correo o usuario)
│   ├── auth/registro/      Registro con foto de perfil
│   ├── publicaciones/      Feed (orden, "Ver más", me gusta, eliminar)
│   ├── crear-publicacion/  Formulario con imagen opcional
│   └── perfil/             Mi perfil con las últimas 3 publicaciones
├── layout/header/          Navbar
└── shared/components/      Dialogo (MatDialog), PublicacionCard (input/output)
```

Rutas: `/login`, `/registro`, `/publicaciones`, `/crear-publicacion`, `/perfil`, todas con `loadComponent` (lazy loading).

---

## Cómo correrlo en local

Requisitos: **Node 22 o superior** y una base MongoDB (local o Atlas).

```bash
# Backend
cd backend
cp .env.example .env        # completar MONGODB_URI, JWT_SECRET y Cloudinary
npm install
npm run start:dev           # http://localhost:3000

# Frontend (otra terminal)
cd frontend
npm install
npm start                   # http://localhost:4200
```

Sin credenciales de Cloudinary el registro funciona igual **sin foto**; si se manda una foto, la API responde 503 ("Falta configurar Cloudinary").

### Datos de prueba (seed)

Para probar sin crear usuarios a mano, con `MONGODB_URI` apuntando a un MongoDB **local** (por ejemplo `mongodb://127.0.0.1:27017/maxify_dev`):

```bash
cd backend
npm run seed
```

Borra y vuelve a cargar usuarios, publicaciones, me gusta y comentarios (se puede correr las veces que haga falta). Por seguridad **solo corre contra `localhost` / `127.0.0.1`**: si `MONGODB_URI` apunta a Atlas, se niega y no toca nada.

| Usuario | Perfil | Contraseña |
|---|---|---|
| `admin` | administrador | `Clave1234` |
| `lumendez`, `jpereyra`, `anarossi`, `msosa`, `camig` | usuario | `Clave1234` |

Carga 12 publicaciones activas (alcanza para probar "Ver más"), una dada de baja, 22 me gusta y 10 comentarios. `lumendez` tiene comentarios en sus publicaciones para ver Mi perfil completo. Los correos son `<usuario>@maxify.test`.

### Variables de entorno del backend

| Variable | Ejemplo | Para qué |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://usuario:clave@cluster.mongodb.net/maxify` | Conexión a Mongo |
| `PORT` | `3000` | Puerto (Render lo define solo) |
| `FRONTEND_ORIGIN` | `https://maxify.vercel.app,http://localhost:4200` | Orígenes permitidos por CORS, separados por coma |
| `JWT_SECRET` | cadena larga aleatoria | Firma de los tokens |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | — | Subida de imágenes |

---

## Deploy

### 1. MongoDB Atlas
1. Crear una cuenta en [mongodb.com/atlas](https://www.mongodb.com/atlas) y un cluster **M0 (gratis)**.
2. *Database Access* → crear un usuario de base de datos con contraseña.
3. *Network Access* → agregar `0.0.0.0/0` (Render no tiene IP fija en el plan gratuito).
4. *Connect → Drivers* → copiar la cadena `mongodb+srv://…` y agregar el nombre de la base (`/maxify`) antes del `?`.

### 2. Cloudinary
1. Crear una cuenta en [cloudinary.com](https://cloudinary.com).
2. En *Dashboard → API Keys* copiar **Cloud name**, **API Key** y **API Secret**.

### 3. Backend en Render
1. Subir el repositorio a GitHub.
2. En [render.com](https://render.com): *New → Blueprint* y elegir el repositorio (usa `render.yaml`).
   También se puede crear a mano un *Web Service* con **Root Directory** `backend`, **Build** `npm ci && npm run build` y **Start** `npm run start:prod`.
3. Cargar las variables `MONGODB_URI`, `FRONTEND_ORIGIN` (la URL de Vercel, se completa en el paso 4) y las tres de Cloudinary. `JWT_SECRET` la genera Render.
4. Probar `https://<servicio>.onrender.com/` → `{"app":"Maxify API","estado":"ok"}`.

> El plan gratuito "duerme" el servicio tras 15 minutos sin uso: el primer pedido puede tardar ~50 segundos.

### 4. Frontend en Vercel
1. Poner la URL de Render en `frontend/src/environments/environment.prod.ts` (`apiUrl`) y hacer push.
2. En [vercel.com](https://vercel.com): *Add New → Project*, importar el repositorio y elegir **Root Directory** `frontend`.
   `vercel.json` ya define el build, la carpeta de salida y la reescritura de rutas a `index.html`.
3. Copiar la URL que asigna Vercel y cargarla en `FRONTEND_ORIGIN` de Render (después, *Manual Deploy* para que tome el cambio).

---

## Ramas de Git

```
sprint-N ──▶ develop ──▶ main
```

- **`main`**: versión oficial. Es la única rama que despliegan Vercel y Render.
- **`develop`**: integración del desarrollo. Sale de `main`.
- **`sprint-1`, `sprint-2`, …**: una rama por sprint, creada desde `develop`. Al cerrar el sprint se integra en `develop` y, una vez probada, `develop` pasa a `main`.

En Vercel conviene dejar `main` como *Production Branch* (las demás ramas generan deploys de vista previa).

---

## Decisiones técnicas

La base del proyecto sigue lo visto en clase: componentes standalone, `inject()`, signals (`signal` privado + `computed` de lectura en los servicios), control flow `@if` / `@for`, Reactive Forms con `FormBuilder`, lazy loading con `loadComponent`, estructura `core / features / layout / shared`; en Nest, módulos + controllers + services, Mongoose con `@Schema` / `@Prop`, DTOs con `class-validator` y `ValidationPipe` global, método `presentar()` para armar las respuestas, `loadEnvFile('.env')` y el servicio de imágenes con Multer, Sharp y Cloudinary.

Lo que **no** se vio en clase y por qué se usa:

| Tema | Por qué | Elección |
|---|---|---|
| Hash de contraseñas | La consigna pide guardar la contraseña encriptada. | **bcrypt** (10 rondas). Se guarda solo el hash (incluye el salt); en el login se compara con `bcrypt.compare`. |
| JWT | La consigna exige autenticación propia con token (en clase se usó Supabase Auth). | **@nestjs/jwt**. Login y registro devuelven un token con id, correo, usuario y perfil, que vence a los 15 minutos. Un guard propio (`CanActivate`) registrado como global con `APP_GUARD` valida la firma y el vencimiento en todas las rutas; las públicas se marcan con `@Publico()` (seguro por defecto). El decorador `@UsuarioActual()` entrega el usuario del token al controller. |
| Interceptor HTTP en Angular | La API necesita saber quién publica o da me gusta. | **`HttpInterceptorFn`** funcional (mismo estilo que los guards de clase): agrega `Authorization: Bearer <token>` a cada pedido y, si la API responde 401 (token vencido), cierra la sesión y vuelve al login. Se adelantó del Sprint 3 porque desde este sprint todas las rutas de publicaciones piden token. |
| Librería de UI | La consigna pide un diseño trabajado y uniforme y prohíbe `alert()`. | **Angular Material** con tema propio: `MatDialog` para modales, `MatSnackBar` para avisos, `mat-form-field` para formularios y `mat-spinner` para cargas. |

Otras decisiones:

- **Monorepo con dos proyectos**: una sola entrega en GitHub y dos aplicaciones que se despliegan por separado.
- **Un solo campo "Correo o usuario"** en el login: los dos son únicos y el backend busca por cualquiera de los dos. El nombre de usuario no admite `@`, así nunca se confunde con un correo.
- **Correo y usuario únicos** con índice `unique` en Mongo y chequeo previo: si se repiten la API responde **409** e indica el campo, y el formulario lo marca en rojo.
- **El registro público siempre crea perfil `usuario`**: el DTO no acepta el campo `perfil` (con `forbidNonWhitelisted` responde 400). Los administradores se crean desde el panel de administración (Sprint 4).
- **Mismo mensaje para usuario inexistente y contraseña incorrecta** (401), para no revelar qué cuentas existen.
- **Status HTTP**: 201 al registrar (crea un recurso), 200 en el login (no crea nada), 400 validación, 401 credenciales, 403 cuenta deshabilitada, 409 duplicado.
- **Validaciones en los dos lados**: el front valida para dar mensajes inmediatos y el back vuelve a validar todo, porque cualquiera puede llamar a la API directamente.
- **Imágenes en Cloudinary**: el disco de Render es efímero (se borra en cada deploy). La foto se valida por su firma binaria, se convierte a WebP con Sharp y en Mongo se guarda solo la URL. Si el alta falla después de subirla, se borra de Cloudinary.
- **Sesión en `localStorage`** (token + datos del usuario): front y back están en dominios distintos, y así es más simple que con cookies entre dominios.
- **Tema "Cálido editorial"**: fondo crema `#FAF7F2`, acento terracota `#C2410C`, tipografía **Figtree** y botones en forma de píldora. Los colores son variables CSS que también alimentan el tema de Material.
- **Modo claro y oscuro automático**: la app sigue la preferencia del sistema operativo o del navegador (`prefers-color-scheme`). Cada token de color tiene su versión oscura (fondo `#1C1917`, acento `#EA7A4B`) y solo se redefinen las variables en `styles.scss`, así ningún componente necesita estilos propios para el modo oscuro.
- **CORS** restringido a `FRONTEND_ORIGIN` (admite varios orígenes separados por coma).

**Sprint 2 – publicaciones**

- **"Ver más" en lugar de páginas numeradas**: cada carga pide la siguiente con `offset` y `limit` y la agrega debajo. La API devuelve también el `total`, así el front sabe si quedan más. Desde la segunda carga aparece un botón flotante para volver arriba. Si al cambiar el orden había un pedido en curso, se cancela para que no se mezclen las listas.
- **El orden lo hace el servidor** (`sort` de Mongo), no el front: ordenar en el navegador solo ordenaría lo ya cargado. Se desempata por `_id` para que el orden sea estable entre páginas.
- **Me gusta en una colección propia** (`likes`) con **índice único** `(usuario, publicacion)`: la base de datos garantiza uno solo por usuario; si se repite, Mongo rechaza el alta (error 11000) y la API responde **409**.
- **Contador `likesCount`** en la publicación, actualizado con `$inc` (atómico, como `reservar()` de clase): ordenar por me gusta es un `sort` simple, sin contar en cada pedido. Al quitar, la condición `likesCount > 0` evita negativos.
- **Baja lógica** (`eliminada: true`): la publicación deja de listarse pero queda en la base para el historial y las estadísticas. Solo el autor o un administrador (el perfil viaja en el token); si no, **403**. Responde **204** sin contenido, como el `DELETE` visto en clase.
- **Quitar un me gusta que no existe → 404**: el recurso "me gusta de este usuario" no existe.
- **Cada publicación es un componente** (`PublicacionCard`): recibe la publicación con `input()` y emite `alternarMeGusta` y `eliminar` con `output()`. La página decide qué hacer: llama a la API y abre el modal de confirmación (sin `alert()`).
- **Comentarios en Mi perfil**: el controller de comentarios es del Sprint 3, pero el perfil ya tiene que mostrarlos. Se agregó el esquema `Comentario` (colección propia, para poder paginarlos y contarlos por fecha más adelante) y el listado acepta `comentarios=N` para traer los últimos N de cada publicación. La publicación guarda `comentariosCount` con el mismo criterio que `likesCount`.
- **Referencias con `Schema.Types.ObjectId`**: en `@Prop({ type })` se usa el tipo de esquema de Mongoose y no la clase `Types.ObjectId`; con esta última Mongoose guarda el valor sin convertir ("Mixed") y las búsquedas por id no coinciden.

---

## Estado por sprint

- [x] **Sprint 1**: proyectos, registro, login, navegación, favicon, pantallas base de Publicaciones y Mi perfil, configuración de deploy.
- [x] **Sprint 2**: crear publicaciones con imagen opcional, listado con orden y "Ver más", dar y quitar me gusta, eliminar las propias (baja lógica), Mi perfil con las últimas 3 publicaciones y sus comentarios.
- [ ] **Sprint 3**: comentarios, validación del token, pantalla Cargando, sesión de 10 minutos con modal para extenderla.
- [ ] **Sprint 4**: administración de usuarios, estadísticas, PWA, pipes y directivas propias.
