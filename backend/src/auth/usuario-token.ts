import type { Perfil } from '../usuarios/usuario.schema';

// Datos que viajan dentro del JWT (los firma AuthService al hacer login).
export interface UsuarioToken {
  sub: string; // id del usuario
  correo: string;
  username: string;
  perfil: Perfil;
}
