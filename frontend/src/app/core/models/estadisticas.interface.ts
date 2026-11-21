// Respuestas de /estadisticas (mismo formato que el backend).

export interface RangoFechas {
  desde: string; // AAAA-MM-DD
  hasta: string; // AAAA-MM-DD
}

export interface PublicacionesPorUsuario {
  usuarioId: string;
  username: string;
  nombre: string;
  apellido: string;
  cantidad: number;
}

export interface ComentariosPorDia {
  total: number;
  dias: { fecha: string; cantidad: number }[];
}

export interface ComentariosPorPublicacion {
  publicacionId: string;
  titulo: string;
  autor: string;
  cantidad: number;
}
