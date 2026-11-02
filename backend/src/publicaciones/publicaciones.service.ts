import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isObjectIdOrHexString } from 'mongoose';
import type { SortOrder } from 'mongoose';
import type { UsuarioToken } from '../auth/usuario-token';
import { ImagenesService } from '../imagenes/imagenes.service';
import type { UsuarioDocument } from '../usuarios/usuario.schema';
import { ComentarioMongo } from './comentario.schema';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import { LikeMongo } from './like.schema';
import type {
  AutorResumen,
  Comentario,
  EstadoMeGusta,
  PaginaPublicaciones,
  Publicacion,
} from './publicacion';
import { PublicacionMongo } from './publicacion.schema';

// Publicación con el autor ya cargado por populate().
type PublicacionConAutor = Omit<PublicacionMongo, 'autor'> & {
  _id: Types.ObjectId;
  autor: UsuarioDocument | null;
};

// Comentario con el autor ya cargado por populate().
type ComentarioConAutor = Omit<ComentarioMongo, 'autor'> & {
  _id: Types.ObjectId;
  autor: UsuarioDocument | null;
};

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(PublicacionMongo.name)
    private readonly modelo: Model<PublicacionMongo>,
    @InjectModel(LikeMongo.name)
    private readonly likes: Model<LikeMongo>,
    @InjectModel(ComentarioMongo.name)
    private readonly comentarios: Model<ComentarioMongo>,
    private readonly imagenes: ImagenesService,
  ) {}

  // Crea la publicación a nombre del usuario del token.
  // Mismo flujo que crear() de la clase 11: si el alta falla después de subir
  // la imagen, se borra de Cloudinary para no dejarla huérfana.
  async crear(
    datos: CrearPublicacionDto,
    usuario: UsuarioToken,
    imagen?: Express.Multer.File,
  ): Promise<Publicacion> {
    const subida = imagen
      ? await this.imagenes.subir(
          await this.imagenes.normalizar(imagen),
          'maxify/publicaciones',
        )
      : undefined;
    try {
      const creada = await this.modelo.create({
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        imagenUrl: subida?.url ?? '',
        imagenPublicId: subida?.publicId,
        autor: new Types.ObjectId(usuario.sub),
      });
      const conAutor = await creada.populate<{
        autor: UsuarioDocument | null;
      }>('autor');
      return this.presentar(conAutor, false);
    } catch (error) {
      await this.imagenes.eliminar(subida?.publicId);
      throw error;
    }
  }

  // Lista las publicaciones activas con orden, filtro por autor y paginación.
  async listar(
    filtros: ListarPublicacionesDto,
    usuario: UsuarioToken,
  ): Promise<PaginaPublicaciones> {
    const condicion: { eliminada: boolean; autor?: Types.ObjectId } = {
      eliminada: false,
    };
    if (filtros.usuario) condicion.autor = new Types.ObjectId(filtros.usuario);

    // _id al final desempata: así el orden es estable entre páginas.
    const orden: Record<string, SortOrder> =
      filtros.orden === 'likes'
        ? { likesCount: -1, createdAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

    const [publicaciones, total] = await Promise.all([
      this.modelo
        .find(condicion)
        .sort(orden)
        .skip(filtros.offset)
        .limit(filtros.limit)
        .populate<{ autor: UsuarioDocument | null }>('autor')
        .exec(),
      this.modelo.countDocuments(condicion).exec(),
    ]);

    // Un solo pedido para saber a cuáles de esta página les dio "me gusta".
    const ids = publicaciones.map((p) => p._id);
    const misLikes = await this.likes
      .find({ usuario: usuario.sub, publicacion: { $in: ids } })
      .exec();
    const conMeGusta = new Set(misLikes.map((l) => l.publicacion.toString()));

    const comentarios =
      filtros.comentarios > 0
        ? await this.ultimosComentarios(ids, filtros.comentarios)
        : undefined;

    return {
      publicaciones: publicaciones.map((p) => {
        const id = p._id.toString();
        const presentada = this.presentar(p, conMeGusta.has(id));
        if (comentarios) presentada.comentarios = comentarios.get(id) ?? [];
        return presentada;
      }),
      total,
    };
  }

  // Baja lógica: solo el autor o un administrador.
  async eliminar(id: string, usuario: UsuarioToken): Promise<void> {
    const publicacion = await this.buscarActiva(id);
    const esAutor = publicacion.autor.toString() === usuario.sub;
    const esAdmin = usuario.perfil === 'administrador';
    if (!esAutor && !esAdmin)
      throw new ForbiddenException(
        'Solo el autor o un administrador pueden eliminar esta publicación',
      );
    publicacion.eliminada = true;
    await publicacion.save();
  }

  async darMeGusta(id: string, usuario: UsuarioToken): Promise<EstadoMeGusta> {
    await this.buscarActiva(id);
    try {
      await this.likes.create({ usuario: usuario.sub, publicacion: id });
    } catch (error) {
      // 11000 = índice único (usuario, publicacion) violado.
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Ya le diste me gusta a esta publicación');
      throw error;
    }
    // Actualización atómica del contador, como reservar() en la clase 10.
    const actualizada = await this.modelo
      .findByIdAndUpdate(id, { $inc: { likesCount: 1 } }, { new: true })
      .exec();
    return { likesCount: actualizada?.likesCount ?? 0, meGusta: true };
  }

  async quitarMeGusta(
    id: string,
    usuario: UsuarioToken,
  ): Promise<EstadoMeGusta> {
    await this.buscarActiva(id);
    const borrado = await this.likes
      .findOneAndDelete({ usuario: usuario.sub, publicacion: id })
      .exec();
    if (!borrado)
      throw new NotFoundException(
        'No le habías dado me gusta a esta publicación',
      );
    // La condición likesCount > 0 evita que el contador quede negativo.
    const actualizada = await this.modelo
      .findOneAndUpdate(
        { _id: id, likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } },
        { new: true },
      )
      .exec();
    return { likesCount: actualizada?.likesCount ?? 0, meGusta: false };
  }

  private async buscarActiva(id: string) {
    if (!isObjectIdOrHexString(id))
      throw new BadRequestException('ID de publicación inválido');
    const publicacion = await this.modelo
      .findOne({ _id: id, eliminada: false })
      .exec();
    if (!publicacion) throw new NotFoundException('No existe la publicación');
    return publicacion;
  }

  // Devuelve, por id de publicación, sus últimos "cantidad" comentarios.
  private async ultimosComentarios(
    ids: Types.ObjectId[],
    cantidad: number,
  ): Promise<Map<string, Comentario[]>> {
    const todos = await this.comentarios
      .find({ publicacion: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate<{ autor: UsuarioDocument | null }>('autor')
      .exec();
    const porPublicacion = new Map<string, Comentario[]>();
    for (const comentario of todos) {
      const clave = comentario.publicacion.toString();
      const lista = porPublicacion.get(clave) ?? [];
      if (lista.length < cantidad)
        lista.push(this.presentarComentario(comentario));
      porPublicacion.set(clave, lista);
    }
    return porPublicacion;
  }

  private presentar(
    publicacion: PublicacionConAutor,
    meGusta: boolean,
  ): Publicacion {
    return {
      id: publicacion._id.toString(),
      titulo: publicacion.titulo,
      mensaje: publicacion.mensaje,
      imagenUrl: publicacion.imagenUrl,
      autor: this.presentarAutor(publicacion.autor),
      likesCount: publicacion.likesCount,
      comentariosCount: publicacion.comentariosCount ?? 0,
      meGusta,
      creadaEn: publicacion.createdAt.toISOString(),
    };
  }

  private presentarComentario(comentario: ComentarioConAutor): Comentario {
    return {
      id: comentario._id.toString(),
      mensaje: comentario.mensaje,
      autor: this.presentarAutor(comentario.autor),
      modificado: comentario.modificado,
      creadoEn: comentario.createdAt.toISOString(),
    };
  }

  private presentarAutor(autor: UsuarioDocument | null): AutorResumen | null {
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
}
