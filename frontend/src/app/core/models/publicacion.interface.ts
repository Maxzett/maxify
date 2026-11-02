// Mismos formatos que devuelve el backend.
export interface AutorResumen {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
  imagenUrl: string;
}

export interface Comentario {
  id: string;
  mensaje: string;
  autor: AutorResumen | null;
  modificado: boolean;
  creadoEn: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagenUrl: string;
  autor: AutorResumen | null;
  likesCount: number;
  comentariosCount: number;
  // true si el usuario logueado le dio "me gusta".
  meGusta: boolean;
  creadaEn: string;
  // Solo viene cuando se pide con ?comentarios=N (Mi perfil).
  comentarios?: Comentario[];
}

export type Orden = 'fecha' | 'likes';

// Respuesta de GET /publicaciones.
export interface PaginaPublicaciones {
  publicaciones: Publicacion[];
  total: number;
}

// Respuesta de dar o quitar "me gusta".
export interface EstadoMeGusta {
  likesCount: number;
  meGusta: boolean;
}
