// Seed de datos de demostración.
//
// BORRA y vuelve a cargar usuarios, publicaciones, me gusta y comentarios.
//
// Uso (desde /backend):
//   npm run seed        → MongoDB local (MONGODB_URI de .env). Solo acepta
//                         localhost / 127.0.0.1.
//   npm run seed:prod   → base de producción (Atlas). Usa MONGODB_URI_PROD si
//                         está definida; si no, la MONGODB_URI de .env cuando
//                         apunta a Atlas. Antes de borrar pide escribir el
//                         nombre de la base para confirmar.
//
// Todos los usuarios tienen la contraseña: Clave1234
//   admin, mdiaz → perfil administrador
//   lumendez, jpereyra, anarossi, msosa, camig, fbenitez, vlopez, nacosta,
//   srodriguez → perfil usuario
//   tmolina → perfil usuario, deshabilitado (para probar la baja lógica)
//
// Carga ~45 publicaciones de los últimos 3 meses, con me gusta y comentarios
// repartidos en distintos días, para que el dashboard tenga datos.

const { existsSync } = require('node:fs');
const readline = require('node:readline/promises');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Types;

if (existsSync('.env')) process.loadEnvFile('.env');
const produccion = process.argv.includes('--produccion');

// true si la cadena apunta a un MongoDB de esta PC.
const esLocal = (cadena) => {
  const host = cadena.replace(/^mongodb:\/\/([^@/]*@)?/, '').split(/[/:,?]/)[0];
  return cadena.startsWith('mongodb://') && ['localhost', '127.0.0.1'].includes(host);
};
const esCadenaMongo = (cadena) => /^mongodb(\+srv)?:\/\//.test(cadena ?? '');

// En producción se usa MONGODB_URI_PROD; si no está definida, la MONGODB_URI
// del .env, siempre que apunte a Atlas (no a una base local).
const uriEnv = process.env.MONGODB_URI ?? '';
const uri = produccion
  ? esCadenaMongo(process.env.MONGODB_URI_PROD)
    ? process.env.MONGODB_URI_PROD
    : esCadenaMongo(uriEnv) && !esLocal(uriEnv)
      ? uriEnv
      : ''
  : uriEnv;

if (produccion) {
  if (!uri) {
    console.error(
      'Falta la conexión de producción. Poné la cadena de Atlas en MONGODB_URI (backend/.env)\n' +
        'o definí MONGODB_URI_PROD, por ejemplo:\n' +
        '  $env:MONGODB_URI_PROD="mongodb://usuario:clave@host1,host2,host3/maxify?tls=true&..."; npm run seed:prod',
    );
    process.exit(1);
  }
  // Muestra a qué servidor se conecta, sin la contraseña.
  const destino = uri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, '').split(/[/?]/)[0].split(',')[0];
  console.log(`Producción: conectando a ${destino}...`);
} else {
  // Protección: sin --produccion el seed solo corre contra una base local.
  if (!esLocal(uri)) {
    console.error(
      'El seed solo corre contra un MongoDB local (mongodb://localhost o 127.0.0.1).\n' +
        'Revisá MONGODB_URI en backend/.env. Para producción usá npm run seed:prod.',
    );
    process.exit(1);
  }
}

// En producción hay que escribir el nombre de la base para confirmar el borrado.
async function confirmarProduccion(nombreBase) {
  const consola = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(
    `\nATENCIÓN: se van a BORRAR todos los usuarios, publicaciones, me gusta y ` +
      `comentarios de la base "${nombreBase}" y se cargarán los datos de demostración.`,
  );
  const respuesta = await consola.question(`Escribí "${nombreBase}" para confirmar: `);
  consola.close();
  return respuesta.trim() === nombreBase;
}

const PASSWORD = 'Clave1234';
const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const ahora = Date.now();
const hace = (ms) => new Date(ahora - ms);

// Números "aleatorios" con semilla fija (mulberry32): cada corrida del seed
// genera exactamente los mismos datos.
let semilla = 20261125;
function azar() {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
// n elementos distintos de la lista, en orden aleatorio.
function varios(lista, n) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

// ---------------------------------------------------------------------------
// Usuarios. "peso" = qué tan seguido publica y comenta (para que los
// gráficos no queden parejos). tmolina queda deshabilitado para mostrar la
// baja lógica en el panel.
// ---------------------------------------------------------------------------
const usuarios = [
  { username: 'admin', nombre: 'Ada', apellido: 'Lovelace', perfil: 'administrador', fechaNacimiento: '1995-12-10', descripcion: 'Administradora de Maxify.', peso: 1 },
  { username: 'lumendez', nombre: 'Lucía', apellido: 'Méndez', perfil: 'usuario', fechaNacimiento: '2003-05-14', descripcion: 'Estudiante de la Tecnicatura en Programación. Me gusta el café y el código prolijo.', peso: 6 },
  { username: 'jpereyra', nombre: 'Julián', apellido: 'Pereyra', perfil: 'usuario', fechaNacimiento: '2001-09-02', descripcion: 'Fan de NestJS y de los apuntes ordenados.', peso: 5 },
  { username: 'anarossi', nombre: 'Ana', apellido: 'Rossi', perfil: 'usuario', fechaNacimiento: '2002-03-21', descripcion: 'Fotos, atardeceres y Angular.', peso: 4 },
  { username: 'msosa', nombre: 'Martín', apellido: 'Sosa', perfil: 'usuario', fechaNacimiento: '2000-11-30', descripcion: '', peso: 2 },
  { username: 'camig', nombre: 'Camila', apellido: 'Gómez', perfil: 'usuario', fechaNacimiento: '2004-07-08', descripcion: 'Escucho podcasts en el colectivo.', peso: 3 },
  { username: 'fbenitez', nombre: 'Federico', apellido: 'Benítez', perfil: 'usuario', fechaNacimiento: '1999-02-17', descripcion: 'Backend de día, guitarrista de noche.', peso: 4 },
  { username: 'vlopez', nombre: 'Valentina', apellido: 'López', perfil: 'usuario', fechaNacimiento: '2003-10-05', descripcion: 'Diseño UI y CSS que no se rompe.', peso: 3 },
  { username: 'nacosta', nombre: 'Nicolás', apellido: 'Acosta', perfil: 'usuario', fechaNacimiento: '2002-06-12', descripcion: 'Aprendiendo Docker de a poco.', peso: 2 },
  { username: 'srodriguez', nombre: 'Sofía', apellido: 'Rodríguez', perfil: 'usuario', fechaNacimiento: '2001-12-01', descripcion: 'Bases de datos y mate amargo.', peso: 3 },
  { username: 'mdiaz', nombre: 'Mateo', apellido: 'Díaz', perfil: 'administrador', fechaNacimiento: '1997-04-23', descripcion: 'Moderador de la comunidad.', peso: 1 },
  { username: 'tmolina', nombre: 'Tomás', apellido: 'Molina', perfil: 'usuario', fechaNacimiento: '2000-08-19', descripcion: 'Cuenta deshabilitada (dato de prueba).', peso: 1, activo: false },
];

// Usuario según su peso (los que publican más salen más seguido).
const conPeso = usuarios.flatMap((u) => Array(u.peso).fill(u.username));
const activos = usuarios.filter((u) => u.activo !== false).map((u) => u.username);

// ---------------------------------------------------------------------------
// Publicaciones escritas a mano (las primeras que se ven en el feed) +
// publicaciones generadas a lo largo de los últimos 3 meses.
// ---------------------------------------------------------------------------
const publicacionesFijas = [
  { autor: 'jpereyra', antes: 25 * MINUTO, titulo: 'Apuntes de NestJS para el parcial', mensaje: 'Armé un resumen de módulos, controllers y DTOs con ejemplos. Si les sirve, lo comparto en los comentarios.' },
  { autor: 'anarossi', antes: 2 * HORA, titulo: 'Atardecer desde la terraza de la facu', mensaje: 'Hoy salimos tarde de la clase de Programación IV, pero valió la pena.', imagen: 'https://picsum.photos/seed/maxify-atardecer/800/500' },
  { autor: 'lumendez', antes: 1 * DIA, titulo: '¿Signals o RxJS?', mensaje: 'Estoy migrando un servicio a signals y me quedan dudas con los efectos. ¿Cómo lo están encarando ustedes?' },
  { autor: 'msosa', antes: 2 * DIA, titulo: 'Busco grupo para el TP de Bases de Datos', mensaje: 'Somos dos y nos falta una persona. Cursamos los martes a la noche.' },
  { autor: 'camig', antes: 3 * DIA, titulo: 'Podcasts de tecnología para el viaje', mensaje: 'Estoy buscando algo para escuchar en el colectivo. ¿Qué recomiendan?' },
  { autor: 'lumendez', antes: 3 * DIA + 5 * HORA, titulo: 'Café de la cantina: ranking', mensaje: 'Probé todos los cafés de la cantina esta semana. Spoiler: el cortado gana.', imagen: 'https://picsum.photos/seed/maxify-cafe/800/500' },
  { autor: 'jpereyra', antes: 4 * DIA, titulo: 'Hackatón en la sede Avellaneda', mensaje: 'Este sábado hay hackatón abierta. Se puede ir en equipos de hasta cuatro.' },
  { autor: 'anarossi', antes: 5 * DIA, titulo: 'Material de Angular 21', mensaje: 'Dejo el link a los ejemplos de control flow con @if y @for que vimos en clase.' },
  { autor: 'lumendez', antes: 7 * DIA, titulo: 'Primer día en la UTN', mensaje: 'Arrancamos Programación IV con todo.' },
  { autor: 'admin', antes: 10 * DIA, titulo: 'Bienvenidos a Maxify', mensaje: 'Publiquen, comenten y den me gusta. Respeten las normas de convivencia.' },
];

const temas = [
  ['Guards funcionales en Angular', 'Pasé todos mis guards a CanActivateFn y quedaron mucho más simples. ¿Alguien sigue usando clases?'],
  ['Mongo: índices únicos', 'Si necesitan que algo no se repita, el índice único lo garantiza la base de datos.'],
  ['¿Qué hosting usan para el back?', 'Estoy entre Render y Railway. El plan gratis de Render duerme el servicio y tarda en despertar.'],
  ['Tip: atajos de VS Code', 'Ctrl + D para seleccionar la siguiente coincidencia me cambió la vida.'],
  ['Aggregations que me salvaron el TP', 'Con $match + $group armé todas las estadísticas en una sola consulta.'],
  ['Mi setup para programar', 'Monitor vertical para el código y otro para el navegador. No vuelvo atrás.'],
  ['Recomiendo Angular Material', 'Con un tema propio no parece genérico y los modales vienen resueltos.'],
  ['¿JWT en cookie o en localStorage?', 'Lo charlamos en clase y cada opción tiene sus pros. ¿Ustedes cuál eligieron?'],
  ['Feria de empleo IT', 'El jueves hay charlas de empresas en el aula magna. Lleven CV impreso.'],
  ['Docker para principiantes', 'Armé un docker-compose con Mongo y la API para no instalar nada en la PC.'],
  ['Final de Matemática', '¿Alguien tiene los parciales viejos? Rindo la semana que viene.'],
  ['Sharp convierte todo a WebP', 'Las imágenes pesan la mitad y se ven igual. Muy recomendable para el TP.'],
  ['Biblioteca abierta los sábados', 'Ahora abre de 9 a 13. Ideal para estudiar en grupo.'],
  ['Pipes puros vs impuros', 'Me costó entender cuándo se recalculan. Dejo un ejemplo con fechas relativas.'],
  ['Partido de fútbol 5', 'Armamos equipo los viernes después de cursar. Faltan dos.'],
  ['Mi primera PWA instalada', 'Agregué el service worker y ya la puedo abrir desde el escritorio del celu.'],
  ['Estudiar con Pomodoro', '25 minutos de foco y 5 de descanso. Me rinde mucho más que maratones.'],
  ['Errores HTTP bien usados', '401 es no autenticado y 403 es sin permisos. No es lo mismo.'],
  ['Chart.js con ng2-charts', 'Hice un gráfico de dona en 10 minutos. La documentación está muy bien.'],
  ['Ofrezco clases de Inglés técnico', 'Si alguien necesita repasar para el final, escríbanme.'],
  ['Hackeando el modo oscuro', 'Con variables CSS y prefers-color-scheme sale casi gratis.'],
  ['Signals y effect()', 'Ojo con escribir signals dentro de un effect: puede quedar en bucle.'],
  ['Atardecer en la costanera', 'Salimos a caminar después de clase.', 'maxify-costanera'],
  ['La cantina subió los precios', 'El cortado ya cuesta lo mismo que en el centro.'],
  ['Repaso de Git', 'Ramas por sprint, develop y main para producción. Así no rompo nada.'],
  ['Mi escritorio después del parcial', 'Caos total, pero aprobé.', 'maxify-escritorio'],
  ['Tests con Vitest', 'Corren rapidísimo comparado con Karma. Los recomiendo.'],
  ['¿Alguien va al meetup de JS?', 'Es el miércoles en Palermo. Hay pizza.'],
  ['bcrypt y el salt', 'El salt queda guardado dentro del hash, por eso compare funciona sin guardarlo aparte.'],
  ['Lluvia y apuntes', 'Día perfecto para quedarse leyendo la documentación de Nest.', 'maxify-lluvia'],
  ['Interceptors de Angular', 'Con uno solo agrego el token y manejo los 401 de toda la app.'],
  ['Clase de consulta', 'El profe agregó una consulta el lunes antes de la entrega.'],
  ['Templates de README', 'Un buen README con arquitectura y decisiones suma mucho en la defensa.'],
  ['Reciclé mi vieja notebook', 'Le puse Linux y quedó como nueva para programar.', 'maxify-notebook'],
  ['Deploy en Vercel', 'Con el rewrite a index.html las rutas de Angular funcionan al recargar.'],
  ['Me recibí de técnico', '¡Gracias a todos los que me ayudaron en el camino!'],
];

// Repartidas en los últimos ~90 días, más concentradas en las últimas semanas.
const publicacionesGeneradas = temas.map(([titulo, mensaje, imagen], i) => {
  const dias = Math.round(Math.pow(azar(), 1.6) * 88) + 2;
  return {
    autor: elegir(conPeso.filter((u) => u !== 'tmolina' || i % 9 === 0)),
    antes: dias * DIA + entero(0, 20) * HORA,
    titulo,
    mensaje,
    imagen: imagen ? `https://picsum.photos/seed/${imagen}/800/500` : undefined,
  };
});

// Una publicación dada de baja: no se lista ni cuenta en las estadísticas.
const publicaciones = [
  ...publicacionesFijas,
  ...publicacionesGeneradas,
  { autor: 'jpereyra', antes: 12 * DIA, titulo: 'Publicación eliminada', mensaje: 'Esta publicación fue dada de baja (dato de prueba).', eliminada: true },
];

// ---------------------------------------------------------------------------
// Comentarios: algunos fijos para las publicaciones de arriba (lumendez tiene
// varios para que Mi perfil se vea completo) y muchos generados.
// [username, índice de la publicación, mensaje, cuánto después de publicarse]
// ---------------------------------------------------------------------------
const comentariosFijos = [
  ['jpereyra', 2, 'Para estado local, signals sin dudas.', 30 * MINUTO],
  ['anarossi', 2, 'RxJS sigue siendo clave para HTTP.', 1 * HORA],
  ['msosa', 2, 'Yo uso toSignal para pasar de uno a otro.', 2 * HORA],
  ['camig', 2, '¡Buena pregunta! Me sumo.', 3 * HORA],
  ['fbenitez', 2, 'computed para todo lo derivado y effect solo para efectos.', 4 * HORA],
  ['msosa', 5, 'El cortado del turno noche gana.', 2 * HORA],
  ['vlopez', 5, 'El submarino no tiene rival.', 3 * HORA],
  ['lumendez', 0, '¡Pasalo! Me salva la vida.', 10 * MINUTO],
  ['camig', 0, 'Gracias Julián 🙌', 15 * MINUTO],
  ['jpereyra', 3, 'Si no consiguen, avisen que somos tres.', 4 * HORA],
  ['lumendez', 4, 'Recomiendo "Hoy en tecnología".', 1 * HORA],
  ['anarossi', 6, 'Vamos con equipo armado.', 3 * HORA],
  ['srodriguez', 8, '¡Bienvenida! Vas a ver que se pasa rápido.', 2 * HORA],
];

const frases = [
  '¡Muy bueno!', 'Gracias por compartir.', 'Totalmente de acuerdo.', 'Me sirvió un montón.',
  '¿Tenés el link?', 'Yo lo hice parecido y funcionó.', 'Jajaja, me pasó lo mismo.',
  'Lo guardo para el parcial.', 'Excelente aporte 👏', 'Mañana lo pruebo.',
  'No sabía esto, gracias.', '¿Y cómo lo resolviste al final?', 'Me sumo.',
  'Qué buena foto.', 'Esto debería estar en el apunte oficial.', 'Lo comparto con mi grupo.',
  'Yo prefiero la otra opción, pero está bien.', 'Clarísimo.', 'Cuenten conmigo.',
  '¿Alguien más tuvo problemas con esto?', 'Me salvaste el TP.', 'Gran dato.',
];

const comentariosGenerados = [];
publicaciones.forEach((p, i) => {
  if (p.eliminada || i < publicacionesFijas.length) return;
  // Algunas publicaciones tienen muchos comentarios y otras ninguno.
  const cantidad = Math.max(0, Math.round(Math.pow(azar(), 1.4) * 11) - 1);
  for (let c = 0; c < cantidad; c++) {
    // Entre 5 minutos y 4 días después de publicarse, nunca en el futuro.
    const despues = Math.min(entero(5, 4 * 24 * 60) * MINUTO, p.antes - MINUTO);
    comentariosGenerados.push([elegir(activos), i, elegir(frases), despues, azar() < 0.12]);
  }
});
const comentarios = [...comentariosFijos.map((c) => [...c, false]), ...comentariosGenerados];

// ---------------------------------------------------------------------------
// Me gusta: cada publicación activa recibe una cantidad variable de usuarios
// distintos (índice único usuario + publicación).
// ---------------------------------------------------------------------------
const likes = [];
publicaciones.forEach((p, i) => {
  if (p.eliminada) return;
  const autores = activos.filter((u) => u !== p.autor);
  const cantidad = Math.round(Math.pow(azar(), 1.3) * autores.length);
  for (const username of varios(autores, cantidad)) likes.push([username, i]);
});

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (produccion && !(await confirmarProduccion(db.databaseName))) {
    console.log('Cancelado: no se modificó nada.');
    await mongoose.disconnect();
    return;
  }
  console.log(`Conectado a ${db.databaseName}. Borrando datos anteriores...`);
  for (const coleccion of ['usuarios', 'publicaciones', 'likes', 'comentarios'])
    await db.collection(coleccion).deleteMany({});

  // Usuarios (la contraseña se guarda hasheada, igual que en el registro).
  const hash = await bcrypt.hash(PASSWORD, 10);
  const idUsuario = {};
  const docsUsuarios = usuarios.map((u, i) => {
    const _id = new ObjectId();
    idUsuario[u.username] = _id;
    const creado = hace((120 - i * 3) * DIA);
    return {
      _id,
      nombre: u.nombre,
      apellido: u.apellido,
      correo: `${u.username}@maxify.test`,
      username: u.username,
      password: hash,
      fechaNacimiento: new Date(`${u.fechaNacimiento}T00:00:00.000Z`),
      descripcion: u.descripcion,
      imagenUrl: '',
      perfil: u.perfil,
      activo: u.activo ?? true,
      createdAt: creado,
      updatedAt: creado,
    };
  });
  await db.collection('usuarios').insertMany(docsUsuarios);

  // Publicaciones: likesCount y comentariosCount se calculan para que
  // coincidan con los documentos de likes y comentarios.
  const docsPublicaciones = publicaciones.map((p, i) => {
    const fecha = hace(p.antes);
    return {
      _id: new ObjectId(),
      titulo: p.titulo,
      mensaje: p.mensaje,
      imagenUrl: p.imagen ?? '',
      autor: idUsuario[p.autor],
      likesCount: likes.filter(([, indice]) => indice === i).length,
      comentariosCount: comentarios.filter(([, indice]) => indice === i).length,
      eliminada: p.eliminada ?? false,
      createdAt: fecha,
      updatedAt: fecha,
    };
  });
  await db.collection('publicaciones').insertMany(docsPublicaciones);

  await db.collection('likes').insertMany(
    likes.map(([username, i]) => {
      const inicio = docsPublicaciones[i].createdAt.getTime();
      const fecha = Math.min(inicio + entero(1, 48 * 60) * MINUTO, ahora - MINUTO);
      return { usuario: idUsuario[username], publicacion: docsPublicaciones[i]._id, createdAt: new Date(fecha) };
    }),
  );

  await db.collection('comentarios').insertMany(
    comentarios.map(([username, i, mensaje, despues, modificado]) => {
      const fecha = new Date(docsPublicaciones[i].createdAt.getTime() + despues);
      return {
        publicacion: docsPublicaciones[i]._id,
        autor: idUsuario[username],
        mensaje,
        modificado,
        createdAt: fecha,
        updatedAt: modificado ? new Date(fecha.getTime() + 10 * MINUTO) : fecha,
      };
    }),
  );

  const activas = docsPublicaciones.filter((p) => !p.eliminada).length;
  console.log(
    `Listo: ${docsUsuarios.length} usuarios (1 deshabilitado), ${activas} publicaciones activas ` +
      `(+1 eliminada), ${likes.length} me gusta y ${comentarios.length} comentarios.\n` +
      `Contraseña de todos: ${PASSWORD} (admin y mdiaz = administradores; tmolina está deshabilitado).`,
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('No se pudo cargar el seed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
