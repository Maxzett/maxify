import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UsuarioDocument } from '../usuarios/usuario.schema';
import type { Publicacion } from './publicacion';
import { PublicacionMongo } from './publicacion.schema';

// Publicación con el autor ya cargado por populate().
type PublicacionConAutor = Omit<PublicacionMongo, 'autor'> & {
  _id: Types.ObjectId;
  autor: UsuarioDocument | null;
};

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(PublicacionMongo.name)
    private readonly modelo: Model<PublicacionMongo>,
  ) {}

  // Versión inicial del listado: las activas, más recientes primero.
  // El orden por "me gusta", el filtro por usuario y la paginación
  // (offset/limit) se agregan en el Sprint 2.
  async listar(): Promise<Publicacion[]> {
    const publicaciones = await this.modelo
      .find({ eliminada: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate<{ autor: UsuarioDocument | null }>('autor')
      .exec();
    return publicaciones.map((p) => this.presentar(p));
  }

  private presentar(publicacion: PublicacionConAutor): Publicacion {
    const autor = publicacion.autor;
    return {
      id: publicacion._id.toString(),
      titulo: publicacion.titulo,
      mensaje: publicacion.mensaje,
      imagenUrl: publicacion.imagenUrl,
      autor: autor
        ? {
            id: autor._id.toString(),
            nombre: autor.nombre,
            apellido: autor.apellido,
            username: autor.username,
            imagenUrl: autor.imagenUrl,
          }
        : null,
      likesCount: publicacion.likesCount,
      creadaEn: publicacion.createdAt.toISOString(),
    };
  }
}
