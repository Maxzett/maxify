// Seed de datos de prueba para desarrollo local.
// Uso (desde /backend):  npm run seed   o   node scripts/seed.js
//
// BORRA y vuelve a cargar usuarios, publicaciones, me gusta y comentarios.
// Por seguridad solo corre contra un MongoDB local (localhost / 127.0.0.1):
// nunca contra Atlas.
//
// Todos los usuarios tienen la contraseña: Clave1234
//   admin     → perfil administrador
//   lumendez, jpereyra, anarossi, msosa, camig → perfil usuario

const { existsSync } = require('node:fs');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Types;

if (existsSync('.env')) process.loadEnvFile('.env');
const uri = process.env.MONGODB_URI ?? '';

// Protección: el seed borra datos, así que solo se permite una base local.
const host = uri.replace(/^mongodb:\/\/([^@/]*@)?/, '').split(/[/:,?]/)[0];
if (!uri.startsWith('mongodb://') || !['localhost', '127.0.0.1'].includes(host)) {
  console.error(
    'El seed solo corre contra un MongoDB local (mongodb://localhost o 127.0.0.1).\n' +
      'Revisá MONGODB_URI en backend/.env.',
  );
  process.exit(1);
}

const PASSWORD = 'Clave1234';
const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const ahora = Date.now();
const hace = (ms) => new Date(ahora - ms);

const usuarios = [
  { username: 'admin', nombre: 'Ada', apellido: 'Lovelace', perfil: 'administrador', fechaNacimiento: '1995-12-10', descripcion: 'Administradora de Maxify.' },
  { username: 'lumendez', nombre: 'Lucía', apellido: 'Méndez', perfil: 'usuario', fechaNacimiento: '2003-05-14', descripcion: 'Estudiante de la Tecnicatura en Programación. Me gusta el café y el código prolijo.' },
  { username: 'jpereyra', nombre: 'Julián', apellido: 'Pereyra', perfil: 'usuario', fechaNacimiento: '2001-09-02', descripcion: 'Fan de NestJS y de los apuntes ordenados.' },
  { username: 'anarossi', nombre: 'Ana', apellido: 'Rossi', perfil: 'usuario', fechaNacimiento: '2002-03-21', descripcion: 'Fotos, atardeceres y Angular.' },
  { username: 'msosa', nombre: 'Martín', apellido: 'Sosa', perfil: 'usuario', fechaNacimiento: '2000-11-30', descripcion: '' },
  { username: 'camig', nombre: 'Camila', apellido: 'Gómez', perfil: 'usuario', fechaNacimiento: '2004-07-08', descripcion: 'Escucho podcasts en el colectivo.' },
];

// autor = username; antes = cuánto hace que se publicó.
const publicaciones = [
  { autor: 'jpereyra', antes: 25 * MINUTO, titulo: 'Apuntes de NestJS para el parcial', mensaje: 'Armé un resumen de módulos, controllers y DTOs con ejemplos. Si les sirve, lo comparto en los comentarios.' },
  { autor: 'anarossi', antes: 2 * HORA, titulo: 'Atardecer desde la terraza de la facu', mensaje: 'Hoy salimos tarde de la clase de Programación IV, pero valió la pena.', imagen: 'https://picsum.photos/seed/maxify-atardecer/800/500' },
  { autor: 'lumendez', antes: 1 * DIA, titulo: '¿Signals o RxJS?', mensaje: 'Estoy migrando un servicio a signals y me quedan dudas con los efectos. ¿Cómo lo están encarando ustedes?' },
  { autor: 'msosa', antes: 2 * DIA, titulo: 'Busco grupo para el TP de Bases de Datos', mensaje: 'Somos dos y nos falta una persona. Cursamos los martes a la noche.' },
  { autor: 'camig', antes: 3 * DIA, titulo: 'Podcasts de tecnología para el viaje', mensaje: 'Estoy buscando algo para escuchar en el colectivo. ¿Qué recomiendan?' },
  { autor: 'lumendez', antes: 3 * DIA + 5 * HORA, titulo: 'Café de la cantina: ranking', mensaje: 'Probé todos los cafés de la cantina esta semana. Spoiler: el cortado gana.', imagen: 'https://picsum.photos/seed/maxify-cafe/800/500' },
  { autor: 'jpereyra', antes: 4 * DIA, titulo: 'Hackatón en la sede Avellaneda', mensaje: 'Este sábado hay hackatón abierta. Se puede ir en equipos de hasta cuatro.' },
  { autor: 'anarossi', antes: 5 * DIA, titulo: 'Material de Angular 21', mensaje: 'Dejo el link a los ejemplos de control flow con @if y @for que vimos en clase.' },
  { autor: 'lumendez', antes: 7 * DIA, titulo: 'Primer día en la UTN', mensaje: 'Arrancamos Programación IV con todo.' },
  { autor: 'msosa', antes: 8 * DIA, titulo: '¿Alguien tiene el enunciado del TP2?', mensaje: 'Me lo perdí en la última clase.' },
  { autor: 'camig', antes: 9 * DIA, titulo: 'Tip: atajos de VS Code', mensaje: 'Ctrl + D para seleccionar la siguiente coincidencia me cambió la vida.' },
  { autor: 'admin', antes: 10 * DIA, titulo: 'Bienvenidos a Maxify', mensaje: 'Publiquen, comenten y den me gusta. Respeten las normas de convivencia.' },
  { autor: 'jpereyra', antes: 12 * DIA, titulo: 'Mongo: índices únicos', mensaje: 'Si necesitan que algo no se repita, el índice único lo garantiza la base de datos.', eliminada: true },
];

// [username, índice de la publicación] → quién le dio me gusta a qué.
const likes = [
  ...['lumendez', 'jpereyra', 'msosa', 'camig', 'admin'].map((u) => [u, 1]),
  ...['jpereyra', 'anarossi', 'camig', 'admin'].map((u) => [u, 4]),
  ...['jpereyra', 'anarossi', 'msosa'].map((u) => [u, 2]),
  ...['anarossi', 'msosa', 'camig'].map((u) => [u, 6]),
  ...['lumendez', 'anarossi'].map((u) => [u, 0]),
  ...['lumendez', 'camig'].map((u) => [u, 7]),
  ['jpereyra', 5],
  ['anarossi', 8],
  ['msosa', 11],
];

// [username, índice de la publicación, mensaje, cuánto después de publicarse]
const comentarios = [
  ['jpereyra', 2, 'Para estado local, signals sin dudas.', 30 * MINUTO],
  ['anarossi', 2, 'RxJS sigue siendo clave para HTTP.', 1 * HORA],
  ['msosa', 2, 'Yo uso toSignal para pasar de uno a otro.', 2 * HORA],
  ['camig', 2, '¡Buena pregunta! Me sumo.', 3 * HORA],
  ['msosa', 5, 'El cortado del turno noche gana.', 2 * HORA],
  ['lumendez', 0, '¡Pasalo! Me salva la vida.', 10 * MINUTO],
  ['camig', 0, 'Gracias Julián 🙌', 15 * MINUTO],
  ['jpereyra', 3, 'Si no consiguen, avisen que somos tres.', 4 * HORA],
  ['lumendez', 4, 'Recomiendo "Hoy en tecnología".', 1 * HORA],
  ['anarossi', 6, 'Vamos con equipo armado.', 3 * HORA],
];

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Conectado a ${db.databaseName}. Borrando datos anteriores...`);
  for (const coleccion of ['usuarios', 'publicaciones', 'likes', 'comentarios'])
    await db.collection(coleccion).deleteMany({});

  // Usuarios (la contraseña se guarda hasheada, igual que en el registro).
  const hash = await bcrypt.hash(PASSWORD, 10);
  const idUsuario = {};
  const docsUsuarios = usuarios.map((u, i) => {
    const _id = new ObjectId();
    idUsuario[u.username] = _id;
    const creado = hace((30 - i) * DIA);
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
      activo: true,
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
    likes.map(([username, i]) => ({
      usuario: idUsuario[username],
      publicacion: docsPublicaciones[i]._id,
      createdAt: new Date(docsPublicaciones[i].createdAt.getTime() + 5 * MINUTO),
    })),
  );

  await db.collection('comentarios').insertMany(
    comentarios.map(([username, i, mensaje, despues]) => {
      const fecha = new Date(docsPublicaciones[i].createdAt.getTime() + despues);
      return {
        publicacion: docsPublicaciones[i]._id,
        autor: idUsuario[username],
        mensaje,
        modificado: false,
        createdAt: fecha,
        updatedAt: fecha,
      };
    }),
  );

  const activas = docsPublicaciones.filter((p) => !p.eliminada).length;
  console.log(
    `Listo: ${docsUsuarios.length} usuarios, ${activas} publicaciones activas ` +
      `(+1 eliminada), ${likes.length} me gusta y ${comentarios.length} comentarios.\n` +
      `Contraseña de todos: ${PASSWORD} (admin = administrador; lumendez tiene comentarios en su perfil).`,
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('No se pudo cargar el seed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
