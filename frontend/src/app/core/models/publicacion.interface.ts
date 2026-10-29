export interface AutorResumen {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
  imagenUrl: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagenUrl: string;
  autor: AutorResumen | null;
  likesCount: number;
  creadaEn: string;
}
