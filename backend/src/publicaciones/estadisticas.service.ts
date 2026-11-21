import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ComentarioMongo } from './comentario.schema';
import { RangoFechasDto } from './dto/rango-fechas.dto';
import { PublicacionMongo } from './publicacion.schema';

// Los días se cuentan con la hora de Argentina (UTC-3), no en UTC: un
// comentario de las 22 h del día 5 cuenta para el 5, no para el 6.
const ZONA = '-03:00';
const MAX_DIAS = 366;
const MAX_PUBLICACIONES = 10;
// Nombres de las colecciones (fijos en cada @Schema) para los $lookup.

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

// Aggregations de Mongo ($match por rango de fechas + $group). Solo cuentan
// publicaciones activas y comentarios de publicaciones activas: lo dado de
// baja deja de estar disponible también en las estadísticas.
@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(PublicacionMongo.name)
    private readonly publicaciones: Model<PublicacionMongo>,
    @InjectModel(ComentarioMongo.name)
    private readonly comentarios: Model<ComentarioMongo>,
  ) {}

  // Gráfico 1: cuántas publicaciones hizo cada usuario en el lapso.
  async publicacionesPorUsuario(
    rango: RangoFechasDto,
  ): Promise<PublicacionesPorUsuario[]> {
    const { inicio, fin } = this.limites(rango);
    return this.publicaciones.aggregate<PublicacionesPorUsuario>([
      { $match: { eliminada: false, createdAt: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$autor', cantidad: { $sum: 1 } } },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario',
        },
      },
      { $unwind: '$usuario' },
      { $sort: { cantidad: -1, 'usuario.username': 1 } },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          username: '$usuario.username',
          nombre: '$usuario.nombre',
          apellido: '$usuario.apellido',
          cantidad: 1,
        },
      },
    ]);
  }

  // Gráfico 2: comentarios realizados por día en el lapso (los días sin
  // comentarios se completan con 0 para que la línea sea continua).
  async comentariosPorDia(rango: RangoFechasDto): Promise<ComentariosPorDia> {
    const { inicio, fin } = this.limites(rango);
    const grupos = await this.comentarios.aggregate<{
      _id: string;
      cantidad: number;
    }>([
      { $match: { createdAt: { $gte: inicio, $lt: fin } } },
      ...this.soloPublicacionesActivas(),
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: ZONA,
            },
          },
          cantidad: { $sum: 1 },
        },
      },
    ]);
    const porFecha = new Map(grupos.map((g) => [g._id, g.cantidad]));
    const dias: ComentariosPorDia['dias'] = [];
    for (
      let dia = new Date(inicio);
      dia < fin;
      dia.setUTCDate(dia.getUTCDate() + 1)
    ) {
      // inicio es la medianoche argentina = 03:00 UTC del mismo día.
      const fecha = dia.toISOString().slice(0, 10);
      dias.push({ fecha, cantidad: porFecha.get(fecha) ?? 0 });
    }
    return { total: grupos.reduce((suma, g) => suma + g.cantidad, 0), dias };
  }

  // Gráfico 3: las publicaciones con más comentarios recibidos en el lapso.
  async comentariosPorPublicacion(
    rango: RangoFechasDto,
  ): Promise<ComentariosPorPublicacion[]> {
    const { inicio, fin } = this.limites(rango);
    return this.comentarios.aggregate<ComentariosPorPublicacion>([
      { $match: { createdAt: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$publicacion', cantidad: { $sum: 1 } } },
      {
        $lookup: {
          from: 'publicaciones',
          localField: '_id',
          foreignField: '_id',
          as: 'publicacion',
        },
      },
      { $unwind: '$publicacion' },
      { $match: { 'publicacion.eliminada': false } },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'publicacion.autor',
          foreignField: '_id',
          as: 'autor',
        },
      },
      { $unwind: { path: '$autor', preserveNullAndEmptyArrays: true } },
      { $sort: { cantidad: -1, 'publicacion.createdAt': -1 } },
      { $limit: MAX_PUBLICACIONES },
      {
        $project: {
          _id: 0,
          publicacionId: { $toString: '$_id' },
          titulo: '$publicacion.titulo',
          autor: { $ifNull: ['$autor.username', 'desconocido'] },
          cantidad: 1,
        },
      },
    ]);
  }

  // Convierte desde/hasta (días completos en hora argentina) a [inicio, fin).
  private limites(rango: RangoFechasDto): { inicio: Date; fin: Date } {
    const inicio = new Date(`${rango.desde}T00:00:00.000${ZONA}`);
    const fin = new Date(`${rango.hasta}T00:00:00.000${ZONA}`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    if (inicio >= fin)
      throw new BadRequestException(
        'La fecha "desde" no puede ser posterior a "hasta"',
      );
    if ((fin.getTime() - inicio.getTime()) / 86_400_000 > MAX_DIAS)
      throw new BadRequestException(
        `El lapso puede ser de hasta ${MAX_DIAS} días`,
      );
    return { inicio, fin };
  }

  // Descarta los comentarios de publicaciones dadas de baja.
  private soloPublicacionesActivas() {
    return [
      {
        $lookup: {
          from: 'publicaciones',
          localField: 'publicacion',
          foreignField: '_id',
          as: 'pub',
        },
      },
      { $unwind: '$pub' },
      { $match: { 'pub.eliminada': false } },
    ];
  }
}
