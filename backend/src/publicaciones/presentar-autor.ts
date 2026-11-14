import type { UsuarioDocument } from '../usuarios/usuario.schema';
import type { AutorResumen } from './publicacion';

// Datos públicos del autor de una publicación o comentario (populate('autor')).
// Lo comparten PublicacionesService y ComentariosService.
export function presentarAutor(
  autor: UsuarioDocument | null,
): AutorResumen | null {
  return autor
    ? {
        id: autor._id.toString(),
        nombre: autor.nombre,
        apellido: autor.apellido,
        username: autor.username,
        imagenUrl: autor.imagenUrl,
      }
    : null;
}
