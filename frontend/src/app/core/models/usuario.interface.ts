export type Perfil = 'usuario' | 'administrador';

// Mismo formato que devuelve el backend (nunca incluye la contraseña).
export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  username: string;
  fechaNacimiento: string; // AAAA-MM-DD
  descripcion: string;
  imagenUrl: string;
  perfil: Perfil;
  activo: boolean;
  creadoEn: string;
}

// Respuesta de /auth/login y /auth/registro.
export interface Sesion {
  token: string;
  usuario: Usuario;
}
