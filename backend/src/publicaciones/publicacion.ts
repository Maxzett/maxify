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

// Lo que la API devuelve de una publicación (nunca el _id crudo).
export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagenUrl: string;
  autor: AutorResumen | null;
  likesCount: number;
  comentariosCount: number;
  // true si el usuario del token le dio "me gusta".
  meGusta: boolean;
  creadaEn: string;
  // Solo cuando se piden con ?comentarios=N (Mi perfil).
  comentarios?: Comentario[];
}

// Respuesta de GET /publicaciones: una página y el total para el "Ver más".
export interface PaginaPublicaciones {
  publicaciones: Publicacion[];
  total: number;
}

// Respuesta de dar o quitar "me gusta".
export interface EstadoMeGusta {
  likesCount: number;
  meGusta: boolean;
}
