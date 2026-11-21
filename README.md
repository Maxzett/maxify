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
>
> **Acceso rápido:** el login tiene el bloque "Entrar rápido como" con los botones "Admin" y "Usuario". Credenciales: `admin` / `Clave1234` (administrador) y `lumendez` / `Clave1234` (usuario). Ver también [`ENTREGA.txt`](ENTREGA.txt).

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
├── auth/                   Registro, login, autorizar y refrescar (bcrypt + JWT)
│   ├── dto/                RegistroDto, LoginDto (class-validator)
│   ├── jwt-auth.guard.ts   Guard global: exige el token y que la cuenta siga habilitada
│   ├── roles.guard.ts      Guard global: @Roles('administrador') → 403 si no es admin
│   ├── publico.decorator.ts        @Publico() para login, registro y health check
│   └── usuario-actual.decorator.ts @UsuarioActual() lee el usuario del token
├── usuarios/               Esquema Usuario, alta de cuentas, editar perfil y ABM de admin
│   └── dto/                CrearUsuarioDto (registro + perfil), ActualizarPerfilDto
├── publicaciones/          Publicaciones, me gusta y comentarios
│   ├── dto/                CrearPublicacionDto, ListarPublicacionesDto, ComentarioDto, ListarComentariosDto
│   ├── publicacion.schema.ts   titulo, mensaje, imagen, autor, likesCount, comentariosCount, eliminada
│   ├── like.schema.ts          un documento por "me gusta" (índice único)
│   ├── comentario.schema.ts    publicacion, autor, mensaje, modificado, fecha
│   ├── comentarios.controller.ts / comentarios.service.ts   crear, editar y listar paginado
│   └── estadisticas.controller.ts / estadisticas.service.ts aggregations para los gráficos (solo admin)
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

**Endpoints del Sprint 3** (todos con token; sin token, con token inválido o vencido → **401**)

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/auth/autorizar` | **200** datos actualizados del usuario del token · 401 token inválido o vencido · 403 cuenta deshabilitada |
| `POST` | `/auth/refrescar` | **200** `{ token }` nuevo con el mismo payload (id, correo, usuario, perfil) y un vencimiento nuevo |
| `GET` | `/publicaciones/:id` | **200** la publicación (con `meGusta` y `comentariosCount`) · 400 id inválido · 404 no existe o fue dada de baja |
| `GET` | `/publicaciones/:id/comentarios?offset=0&limit=5` | **200** `{ comentarios, total }`, del más reciente al más viejo · 400 parámetros inválidos · 404 la publicación no existe |
| `POST` | `/publicaciones/:id/comentarios` (`{ mensaje }`) | **201** el comentario, a nombre del usuario del token y con su fecha · 400 mensaje vacío o de más de 500 caracteres · 404 la publicación no existe |
| `PUT` | `/comentarios/:id` (`{ mensaje }`) | **200** el comentario con `modificado: true` · 400 mensaje inválido · 403 no es el autor · 404 no existe |

**Endpoints del Sprint 4 y edición de perfil** (todos con token; los marcados *admin* responden **403** a un usuario común)

| Método | Ruta | Respuesta |
|---|---|---|
| `PATCH` | `/usuarios/me` (multipart: `nombre`, `apellido`, `fechaNacimiento`, `descripcion`, archivo `foto`; todos opcionales) | **200** el usuario actualizado · 400 datos inválidos o campo no editable (correo, usuario, perfil) |
| `GET` | `/usuarios` *admin* | **200** todos los usuarios, los más nuevos primero |
| `POST` | `/usuarios` *admin* (multipart: datos del registro + `perfil` = `usuario` \| `administrador`) | **201** el usuario creado · 400 datos inválidos · 409 correo o usuario repetido |
| `DELETE` | `/usuarios/:id` *admin* | **200** el usuario con `activo: false` (baja lógica) · 403 deshabilitarse a sí mismo · 404 no existe |
| `POST` | `/usuarios/:id/habilitar` *admin* | **200** el usuario con `activo: true` (alta lógica) · 404 no existe |
| `GET` | `/estadisticas/publicaciones-por-usuario?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` *admin* | **200** `[{ usuarioId, username, nombre, apellido, cantidad }]` · 400 fechas inválidas o lapso de más de 366 días |
| `GET` | `/estadisticas/comentarios?desde=…&hasta=…` *admin* | **200** `{ total, dias: [{ fecha, cantidad }] }` con todos los días del lapso (los vacíos en 0) |
| `GET` | `/estadisticas/comentarios-por-publicacion?desde=…&hasta=…` *admin* | **200** las 10 publicaciones con más comentarios en el lapso: `[{ publicacionId, titulo, autor, cantidad }]` |

Un usuario deshabilitado recibe **403** con `codigo: "CUENTA_DESHABILITADA"` en el login y en cualquier pedido, aunque su token no haya vencido.

### Frontend (`/frontend`)

```
src/app/
├── core/
│   ├── models/             Interfaces Usuario, Sesion, Publicacion, Comentario
│   ├── guards/             authGuard (con sesión), guestGuard (sin sesión) y adminGuard (perfil admin)
│   ├── interceptors/       authInterceptor (token en cada pedido; 401 o cuenta deshabilitada → login)
│   ├── services/           AuthService, SesionService, PublicacionesService, ComentariosService,
│   │                       UsuariosService, EstadisticasService, NotificacionesService
│   ├── utils/              prepararImagen (HEIC → JPG), vencimientoDelToken, cookies
│   └── validators/         passwordSegura, passwordsIguales, edadMinima, errorDeImagen
├── features/
│   ├── cargando/           Pantalla inicial (logo + spinner, mínimo 2 s): valida el token
│   ├── auth/login/         Login (correo o usuario)
│   ├── auth/registro/      Registro con foto de perfil
│   ├── publicaciones/      Feed (orden, paginación numerada, me gusta, eliminar)
│   ├── publicacion/        Detalle: publicación grande + Comentarios (escribir, editar, "Cargar más")
│   ├── crear-publicacion/  Formulario con imagen opcional
│   ├── perfil/             Mi perfil con las últimas 3 publicaciones
│   ├── editar-perfil/      Editar nombre, apellido, fecha de nacimiento, descripción y foto
│   └── dashboard/          Panel de administración (rutas con loadChildren)
│       ├── usuarios/       Listado, búsqueda, habilitar / deshabilitar
│       ├── nuevo-usuario/  Alta con radio buttons Usuario / Administrador
│       └── estadisticas/   Lapso elegible + 3 gráficos (dona, línea, barras) con ng2-charts
├── layout/header/          Navbar
└── shared/
    ├── components/         Dialogo, DialogoSesion (cuenta regresiva), FormularioUsuario,
    │                       PublicacionCard y Paginacion
    ├── pipes/              tiempoRelativo, nombreCompleto, truncar
    └── directives/         *appSoloAdmin, appConfirmar, appImagenFallback
```

Rutas, todas con `loadComponent` (lazy loading):

| Ruta | Guard |
|---|---|
| `/cargando` (entrada de la app) | — |
| `/login`, `/registro` | `guestGuard` |
| `/publicaciones`, `/publicacion/:id`, `/crear-publicacion`, `/perfil`, `/perfil/editar` | `authGuard` |
| `/dashboard/usuarios`, `/dashboard/usuarios/nuevo`, `/dashboard/estadisticas` | `authGuard` + `adminGuard` |

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

**Producción (Atlas):** para dejar la base desplegada con los mismos datos de demostración:

```powershell
cd backend
$env:MONGODB_URI_PROD="mongodb+srv://usuario:clave@cluster.../maxify"
npm run seed:prod
```

Antes de borrar pide escribir el nombre de la base para confirmar. La conexión se toma de la variable `MONGODB_URI_PROD` o, si no está definida, de la `MONGODB_URI` del `.env` cuando apunta a Atlas (con `MONGODB_URI` apuntando a Atlas, alcanza con `npm run seed:prod`). Si la red local no resuelve direcciones `mongodb+srv://` (error `querySrv ECONNREFUSED`), hay que usar la cadena estándar con los **tres hosts** del cluster, `tls=true`, `replicaSet` y `authSource=admin`:

```
mongodb://usuario:clave@ac-xxxx-shard-00-00.yyyy.mongodb.net:27017,ac-xxxx-shard-00-01.yyyy.mongodb.net:27017,ac-xxxx-shard-00-02.yyyy.mongodb.net:27017/maxify?tls=true&replicaSet=atlas-zzzz-shard-0&authSource=admin&retryWrites=true&w=majority
```

Los hosts salen del registro SRV y el `replicaSet` del registro TXT del cluster (`Resolve-DnsName _mongodb._tcp.cluster0.yyyy.mongodb.net -Type SRV` y `Resolve-DnsName cluster0.yyyy.mongodb.net -Type TXT`). Cambiar solo `mongodb+srv://` por `mongodb://` **no funciona**: el nombre `cluster0.yyyy.mongodb.net` no tiene IP propia y Mongoose responde "Could not connect to any servers… IP that isn't whitelisted", aunque la IP esté habilitada.

| Usuario | Perfil | Contraseña |
|---|---|---|
| `admin`, `mdiaz` | administrador | `Clave1234` |
| `lumendez`, `jpereyra`, `anarossi`, `msosa`, `camig`, `fbenitez`, `vlopez`, `nacosta`, `srodriguez` | usuario | `Clave1234` |
| `tmolina` | usuario, **deshabilitado** (para probar la baja lógica) | `Clave1234` |

Carga 46 publicaciones activas de los últimos 3 meses, una dada de baja, unos 190 me gusta y unos 130 comentarios repartidos en distintos días, para que el feed, la paginación y los gráficos del dashboard tengan datos. Los datos "aleatorios" usan una semilla fija: cada corrida genera exactamente lo mismo. `lumendez` tiene comentarios en sus publicaciones para ver Mi perfil completo. Los correos son `<usuario>@maxify.test`.

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
| JWT | La consigna exige autenticación propia con token (en clase se usó Supabase Auth). | **@nestjs/jwt**. Login y registro devuelven un token con id, correo, usuario y perfil. La consigna pide 15 minutos; para la corrección final el docente pidió **3 minutos** (constante `DURACION_TOKEN` en `AuthModule`). Un guard propio (`CanActivate`) registrado como global con `APP_GUARD` valida la firma y el vencimiento en todas las rutas; las públicas se marcan con `@Publico()` (seguro por defecto). El decorador `@UsuarioActual()` entrega el usuario del token al controller. |
| Interceptor HTTP en Angular | La API necesita saber quién publica o da me gusta. | **`HttpInterceptorFn`** funcional (mismo estilo que los guards de clase): agrega `Authorization: Bearer <token>` a cada pedido y, si la API responde 401 (token vencido), cierra la sesión y vuelve al login. Se adelantó del Sprint 3 porque desde este sprint todas las rutas de publicaciones piden token. |
| API de Canvas del navegador | El iPhone saca las fotos en HEIC y el backend solo acepta JPEG, PNG o WebP (Sharp no lee HEIC por las patentes del formato). | `prepararImagen()`: si la foto es HEIC, el navegador la decodifica con `createImageBitmap`, la dibuja en un `<canvas>` achicada a 1600 px y la exporta como JPG con `toBlob`. Sin librerías; Safari (iPhone, iPad y Mac) lee HEIC, y en los navegadores que no pueden se muestra un mensaje claro. El backend no cambia. |
| Gráficos | Dashboard de estadísticas (Sprint 4). | **Chart.js 4 + ng2-charts 10** (`BaseChartDirective`). Se registra con `provideCharts()` solo en las rutas del dashboard, que se cargan con `loadChildren`: el resto de la app no descarga Chart.js. |
| Aggregations de Mongo | Contar publicaciones y comentarios por usuario, por día y por publicación en un lapso. | `$match` por fecha + `$group` + `$lookup`. Los días se agrupan con la hora de Argentina (`timezone: '-03:00'`). |
| Cookies del navegador | El token tenía que tener un tiempo de vida visible y borrarse al cerrar sesión (observación del docente). | `document.cookie` sin librerías (`core/utils/cookies.ts`). |
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
- **Token en una cookie del front con vencimiento** (cambió en el Sprint 4; antes estaba en `localStorage`): la cookie `maxify_token` se crea con `expires` igual al `exp` del JWT, así se ve su tiempo de vida en *DevTools → Application → Cookies*, el navegador la borra solo al vencer y se elimina al cerrar sesión. La escribe el front (no el back) porque front y back están en dominios distintos: se sigue mandando en el header `Authorization: Bearer`. Los datos del usuario no se guardan en el navegador: al recargar, la pantalla Cargando los vuelve a pedir con `/auth/autorizar`.
- **Tema "Cálido editorial"**: fondo crema `#FAF7F2`, acento terracota `#C2410C`, tipografía **Figtree** y botones en forma de píldora. Los colores son variables CSS que también alimentan el tema de Material.
- **Modo claro y oscuro automático**: la app sigue la preferencia del sistema operativo o del navegador (`prefers-color-scheme`). Cada token de color tiene su versión oscura (fondo `#1C1917`, acento `#EA7A4B`) y solo se redefinen las variables en `styles.scss`, así ningún componente necesita estilos propios para el modo oscuro.
- **CORS** restringido a `FRONTEND_ORIGIN` (admite varios orígenes separados por coma).

**Sprint 2 – publicaciones**

- **Paginación numerada** (reemplazó al botón "Ver más" original, a pedido): 5 publicaciones por página con « Anterior · 1 … 4 **5** 6 … 12 · Siguiente » y el texto "Mostrando 6–10 de 12 publicaciones". El servidor recorta con `offset = (página − 1) × 5` y `limit = 5`, y devuelve el `total` para calcular cuántas páginas hay. Reglas: "Anterior" y "Siguiente" se deshabilitan en la primera y en la última página; la página actual se resalta y tiene `aria-current="page"`; con más de 7 páginas se abrevia con "…" (siempre se ven la primera, la última, la actual y sus vecinas, y nunca un "…" que reemplace una sola página); con una sola página la barra no se muestra; al cambiar de página se sube al principio de la lista; al cambiar el orden se vuelve a la página 1.
- **La página y el orden van en la URL** (`/publicaciones?pagina=2&orden=likes`): se conservan al recargar, al volver desde el detalle y con atrás/adelante del navegador. Un valor inválido (`?pagina=abc`) se toma como la página 1 y una página que no existe (`?pagina=99`, o la última se quedó vacía al eliminar) lleva a la última. Si se cambia de página antes de que llegue la respuesta anterior, ese pedido se cancela.
- **La paginación es un componente reutilizable** (`Paginacion`, en `shared/`): recibe la página actual y el total con `input()` y avisa la elegida con `output()`; la página decide qué cargar.
- **El orden lo hace el servidor** (`sort` de Mongo), no el front: ordenar en el navegador solo ordenaría lo ya cargado. Se desempata por `_id` para que el orden sea estable entre páginas.
- **Me gusta en una colección propia** (`likes`) con **índice único** `(usuario, publicacion)`: la base de datos garantiza uno solo por usuario; si se repite, Mongo rechaza el alta (error 11000) y la API responde **409**.
- **Contador `likesCount`** en la publicación, actualizado con `$inc` (atómico, como `reservar()` de clase): ordenar por me gusta es un `sort` simple, sin contar en cada pedido. Al quitar, la condición `likesCount > 0` evita negativos.
- **Baja lógica** (`eliminada: true`): la publicación deja de listarse pero queda en la base para el historial y las estadísticas. Solo el autor o un administrador (el perfil viaja en el token); si no, **403**. Responde **204** sin contenido, como el `DELETE` visto en clase.
- **Quitar un me gusta que no existe → 404**: el recurso "me gusta de este usuario" no existe.
- **Cada publicación es un componente** (`PublicacionCard`): recibe la publicación con `input()` y emite `alternarMeGusta` y `eliminar` con `output()`. La página decide qué hacer: llama a la API y abre el modal de confirmación (sin `alert()`).
- **Comentarios en Mi perfil**: el controller de comentarios es del Sprint 3, pero el perfil ya tiene que mostrarlos. Se agregó el esquema `Comentario` (colección propia, para poder paginarlos y contarlos por fecha más adelante) y el listado acepta `comentarios=N` para traer los últimos N de cada publicación. La publicación guarda `comentariosCount` con el mismo criterio que `likesCount`.
- **Referencias con `Schema.Types.ObjectId`**: en `@Prop({ type })` se usa el tipo de esquema de Mongoose y no la clase `Types.ObjectId`; con esta última Mongoose guarda el valor sin convertir ("Mixed") y las búsquedas por id no coinciden.

**Sprint 3 – comentarios, token y sesión**

- **Pantalla Cargando como entrada de la app**: con un token guardado, llama a `POST /auth/autorizar`. Si es válido va a Publicaciones y, si no, al login. El `authGuard` también manda a Cargando cuando el token todavía no se validó en esta carga de la app (por ejemplo, al recargar con F5) y guarda la página pedida en `?volver=`, así después de validar se vuelve ahí. Si el servidor no responde (por ejemplo, Render arrancando), ofrece "Reintentar" en lugar de cerrar la sesión.
- **`/auth/autorizar` vuelve a buscar al usuario en la base**: el guard ya validó la firma y el vencimiento, pero la cuenta pudo deshabilitarse después de emitir el token. Responde **403** en ese caso y devuelve los datos actualizados del usuario.
- **`/auth/refrescar` firma de nuevo el mismo payload** (id, correo, usuario y perfil) y deja afuera `iat` y `exp` del token anterior, así el nuevo tiene un vencimiento completo.
- **Aviso de sesión calculado desde el propio token**: el `SesionService` lee el `exp` del JWT (el payload es base64, está firmado pero no cifrado) y abre el modal `AVISO_ANTES_MS` antes de que venza. La consigna pide token de 15 minutos con aviso a los 10; para la corrección final quedó en **token de 3 minutos con aviso cuando falta 1**. Sigue siendo correcto si se recarga la página. Un `effect()` sobre el token reprograma los contadores con cada login, refresco o cierre de sesión. "Extender sesión" llama a `/auth/refrescar`; si no se extiende, al vencer se cierra la sesión y se vuelve al login.
- **Cualquier 401 → login**: el interceptor manda el token a todas las rutas salvo login y registro (ahí un 401 es "contraseña incorrecta"). Si varios pedidos fallan juntos, solo el primero cierra la sesión y muestra el aviso.
- **Comentarios paginados con "Cargar más"**: se piden de a 5, del más reciente al más viejo (desempate por `_id`). Cada "Cargar más" usa `offset` = los que ya se muestran y agrega los nuevos abajo sin borrar los anteriores. Un comentario recién escrito se agrega arriba de todo, y como también es el más reciente en el servidor, el `offset` sigue coincidiendo.
- **Edición solo del autor**: el botón "Editar" se muestra solo en los comentarios propios, y el servidor igual lo valida con el usuario del token (**403** si no es el autor). Al editar se marca `modificado: true` y se muestra "(editado)". Si el texto no cambió, no se llama a la API.
- **`comentariosCount` con `$inc`** al comentar, igual que `likesCount`: el feed muestra el contador sin contar los comentarios en cada pedido.
- **Comentarios con su propio controller y service** (`ComentariosController`, `ComentariosService`) dentro del módulo de publicaciones, porque dependen de ellas. Se crean y listan colgados de la publicación (`/publicaciones/:id/comentarios`) y se editan por su propio id (`/comentarios/:id`). Los datos del autor se arman con una función compartida, `presentarAutor()`.
- **Página Publicación** (`/publicacion/:id`): reutiliza `PublicacionCard` con `enlazar = false` para mostrarla en grande. Los comentarios son un componente aparte que recibe el id con `input()` y avisa con `output()` cuando se agrega uno, para actualizar el contador.

**Correcciones de la presentación del Sprint 3**

- **Pantalla Cargando solo con logo y spinner**, con un mínimo de **2 segundos** para que se note (la validación corre en paralelo, los tiempos no se suman). Aparece al abrir la app, al recargar y **al entrar después del login o el registro**: esas pantallas llevan a `/cargando?saludo=…`, que valida el token recién emitido, va a Publicaciones y recién ahí saluda al usuario. `index.html` muestra el mismo logo y spinner mientras descarga Angular, así no hay una pantalla en blanco antes. Los errores de `/auth/autorizar` los resuelve la propia pantalla después de los 2 segundos (el interceptor no redirige en esa ruta).
- **Modal de sesión con cuenta regresiva en vivo** (`DialogoSesion`): muestra `0:59`, `0:58`… y una barra de progreso. El tiempo se recalcula desde el `exp` del token cada 250 ms (no se descuenta de a uno), así coincide con la cookie aunque la pestaña haya estado en segundo plano. Si llega a 0, se cierra la sesión y aparece el modal "Tu sesión venció".
- **Fondo con degradado cálido y trama de puntos** (`background-attachment: fixed`), con su versión para modo oscuro.
- **Botón "+ Crear publicación"** con texto en la barra (en el celular queda solo el ícono).

**Sprint 4 – administración, estadísticas, PWA**

- **Roles con un segundo guard global** (`RolesGuard` + `@Roles('administrador')`), registrado después del `JwtAuthGuard`: autenticado pero sin el perfil necesario → **403** (no 401, porque el token es válido). En el front, `adminGuard` protege el dashboard y `*appSoloAdmin` muestra el botón "Admin".
- **Cuenta deshabilitada en cualquier momento**: el `JwtAuthGuard` busca al usuario en cada pedido y, si un administrador lo deshabilitó, responde **403** con `codigo: "CUENTA_DESHABILITADA"`. El interceptor lo detecta por ese código (no por el texto), cierra la sesión y muestra un modal. Así no hay que esperar a que venza el token.
- **Un administrador no puede deshabilitarse a sí mismo** (403): se quedaría sin acceso al panel.
- **Alta de usuarios reutilizando el registro**: la lógica de alta (validaciones, hash, foto) pasó de `AuthService` a `UsuariosService.registrar()`, que usan el registro público (siempre perfil `usuario`) y el panel (`CrearUsuarioDto` = `RegistroDto` + `perfil`). En el front, el formulario es un componente compartido (`FormularioUsuario`) con tres modos: registro, alta de admin (con radio buttons) y editar perfil.
- **Editar perfil** (`PATCH /usuarios/me`): nombre, apellido, fecha de nacimiento, descripción y foto. El correo y el usuario no se editan porque viajan dentro del token (cambiarlos obligaría a emitir uno nuevo). Si se sube una foto nueva, la anterior se borra de Cloudinary recién cuando el cambio quedó guardado.
- **Baja de publicaciones por un administrador**: el botón aparece en todas las publicaciones (feed y detalle) y el modal aclara que es una baja como administrador. Las publicaciones dadas de baja y sus comentarios dejan de mostrarse y tampoco cuentan en las estadísticas.
- **Estadísticas**: un selector de lapso (desde / hasta + atajos de 7, 30, 90 días y 1 año) se aplica a los tres gráficos, que son de tipos distintos: **dona** (publicaciones por usuario), **línea** (comentarios por día, con los días sin comentarios en 0) y **barras horizontales** (las 10 publicaciones más comentadas). Los colores salen de la paleta del diseño y de las variables CSS, así funcionan en modo oscuro.
- **PWA** con `@angular/service-worker`: manifest con nombre, colores e íconos de Maxify, cache de la app (`assetGroups`) y de los listados de publicaciones con estrategia `freshness` (siempre pide a la red y usa la cache solo si no hay conexión). Solo se registra en producción.
- **Pipes propios**: `tiempoRelativo` ("hace 5 min", "ayer", "14 nov"), `nombreCompleto` ("Lucía Méndez" o "Méndez, Lucía"; "Usuario eliminado" si no hay autor) y `truncar` (corta sin partir palabras).
- **Directivas propias**: `*appSoloAdmin` (estructural, con `TemplateRef` + `ViewContainerRef` + `effect()`, como `*appRole` de clase), `appConfirmar` (abre el modal de confirmación y solo emite `(confirmado)` si se acepta; se usa para eliminar publicaciones y habilitar/deshabilitar usuarios) y `appImagenFallback` (`@HostListener('error')` + `Renderer2`: si una imagen no carga, muestra un avatar genérico u oculta la imagen).

---

## Estado por sprint

- [x] **Sprint 1**: proyectos, registro, login, navegación, favicon, pantallas base de Publicaciones y Mi perfil, configuración de deploy.
- [x] **Sprint 2**: crear publicaciones con imagen opcional, listado con orden y paginación numerada, dar y quitar me gusta, eliminar las propias (baja lógica), Mi perfil con las últimas 3 publicaciones y sus comentarios.
- [x] **Sprint 3**: página Publicación con comentarios (escribir, editar y "Cargar más"), validación y refresco del token, pantalla Cargando, guards, modal para extender la sesión y redirección al login ante cualquier 401.
- [x] **Sprint 4**: baja de publicaciones por administradores, panel de usuarios (listado, alta con perfil, habilitar y deshabilitar), estadísticas con lapso elegible y tres tipos de gráfico, PWA, 3 pipes y 3 directivas propias. Además: edición de perfil, token de 3 minutos en cookie con aviso en vivo, pantalla Cargando de 2 segundos y acceso rápido por rol.
