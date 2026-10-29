import type { Perfil } from './usuario.schema';

// Lo que la API devuelve de un usuario: nunca el password ni el _id crudo.
export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  username: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenUrl: string;
  perfil: Perfil;
  activo: boolean;
  creadoEn: string;
}
