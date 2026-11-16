import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isObjectIdOrHexString } from 'mongoose';
import type { UsuarioToken } from '../auth/usuario-token';
import type { UsuarioDocument } from '../usuarios/usuario.schema';
import { ComentarioMongo } from './comentario.schema';
import { ComentarioDto } from './dto/comentario.dto';
import { ListarComentariosDto } from './dto/listar-comentarios.dto';
import { presentarAutor } from './presentar-autor';
import type { Comentario, PaginaComentarios } from './publicacion';
import { PublicacionMongo } from './publicacion.schema';

// Comentario con el autor ya cargado por populate().
type ComentarioConAutor = Omit<ComentarioMongo, 'autor'> & {
  _id: Types.ObjectId;
  autor: UsuarioDocument | null;
};

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(ComentarioMongo.name)
    private readonly modelo: Model<ComentarioMongo>,
    @InjectModel(PublicacionMongo.name)
    private readonly publicaciones: Model<PublicacionMongo>,
  ) {}

  // Agrega un comentario a nombre del usuario del token (la fecha la pone
  // timestamps: createdAt) y suma 1 al contador de la publicación.
  async crear(
    publicacionId: string,
    datos: ComentarioDto,
    usuario: UsuarioToken,
  ): Promise<Comentario> {
    await this.verificarPublicacion(publicacionId);
    const creado = await this.modelo.create({
      publicacion: new Types.ObjectId(publicacionId),
      autor: new Types.ObjectId(usuario.sub),
      mensaje: datos.mensaje,
    });
    // Contador desnormalizado, igual que likesCount ($inc atómico).
    await this.publicaciones
      .updateOne({ _id: publicacionId }, { $inc: { comentariosCount: 1 } })
      .exec();
    const conAutor = await creado.populate<{
      autor: UsuarioDocument | null;
    }>('autor');
    return this.presentar(conAutor);
  }

  // Comentarios de una publicación, del más nuevo al más viejo, paginados.
  async listar(
    publicacionId: string,
    filtros: ListarComentariosDto,
  ): Promise<PaginaComentarios> {
    await this.verificarPublicacion(publicacionId);
    const condicion = { publicacion: new Types.ObjectId(publicacionId) };
    const [comentarios, total] = await Promise.all([
      this.modelo
        .find(condicion)
        // _id desempata: así el orden es estable entre páginas.
        .sort({ createdAt: -1, _id: -1 })
        .skip(filtros.offset)
        .limit(filtros.limit)
        .populate<{ autor: UsuarioDocument | null }>('autor')
        .exec(),
      this.modelo.countDocuments(condicion).exec(),
    ]);
    return { comentarios: comentarios.map((c) => this.presentar(c)), total };
  }

  // Solo el autor puede editar su comentario; queda marcado como modificado.
  async editar(
    id: string,
    datos: ComentarioDto,
    usuario: UsuarioToken,
  ): Promise<Comentario> {
    if (!isObjectIdOrHexString(id))
      throw new BadRequestException('ID de comentario inválido');
    const comentario = await this.modelo.findById(id).exec();
    if (!comentario) throw new NotFoundException('No existe el comentario');
    // Si la publicación fue dada de baja, sus comentarios tampoco se ven.
    await this.verificarPublicacion(comentario.publicacion.toString());
    if (comentario.autor.toString() !== usuario.sub)
      throw new ForbiddenException('Solo el autor puede editar el comentario');

    comentario.mensaje = datos.mensaje;
    comentario.modificado = true;
    await comentario.save();
    const conAutor = await comentario.populate<{
      autor: UsuarioDocument | null;
    }>('autor');
    return this.presentar(conAutor);
  }

  // Devuelve, por id de publicación, sus últimos "cantidad" comentarios
  // (Mi perfil los muestra debajo de cada publicación).
  async ultimosPorPublicacion(
    ids: Types.ObjectId[],
    cantidad: number,
  ): Promise<Map<string, Comentario[]>> {
    const todos = await this.modelo
      .find({ publicacion: { $in: ids } })
      .sort({ createdAt: -1, _id: -1 })
      .populate<{ autor: UsuarioDocument | null }>('autor')
      .exec();
    const porPublicacion = new Map<string, Comentario[]>();
    for (const comentario of todos) {
      const clave = comentario.publicacion.toString();
      const lista = porPublicacion.get(clave) ?? [];
      if (lista.length < cantidad) lista.push(this.presentar(comentario));
      porPublicacion.set(clave, lista);
    }
    return porPublicacion;
  }

  // 400 si el id no es válido, 404 si no existe o fue dada de baja.
  private async verificarPublicacion(id: string): Promise<void> {
    if (!isObjectIdOrHexString(id))
      throw new BadRequestException('ID de publicación inválido');
    const existe = await this.publicaciones.exists({
      _id: id,
      eliminada: false,
    });
    if (!existe) throw new NotFoundException('No existe la publicación');
  }

  private presentar(comentario: ComentarioConAutor): Comentario {
    return {
      id: comentario._id.toString(),
      mensaje: comentario.mensaje,
      autor: presentarAutor(comentario.autor),
      modificado: comentario.modificado,
      creadoEn: comentario.createdAt.toISOString(),
    };
  }
}
