import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, isObjectIdOrHexString } from 'mongoose';
import type { RegistroDto } from '../auth/dto/registro.dto';
import { ImagenesService } from '../imagenes/imagenes.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import type { Usuario } from './usuario';
import { UsuarioMongo } from './usuario.schema';
import type { Perfil, UsuarioDocument } from './usuario.schema';

export interface NuevoUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  username: string;
  passwordHash: string;
  fechaNacimiento: Date;
  descripcion?: string;
  imagenUrl?: string;
  imagenPublicId?: string;
  perfil?: Perfil;
}

const RONDAS_BCRYPT = 10;
const EDAD_MINIMA = 13;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(UsuarioMongo.name)
    private readonly modelo: Model<UsuarioMongo>,
    private readonly imagenes: ImagenesService,
  ) {}

  // Alta completa de una cuenta: la usan el registro público (siempre perfil
  // "usuario") y el panel de administración (perfil elegido).
  async registrar(
    datos: RegistroDto,
    foto?: Express.Multer.File,
    perfil: Perfil = 'usuario',
  ): Promise<Usuario> {
    if (datos.password !== datos.repetirPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    const fechaNacimiento = this.validarFechaNacimiento(datos.fechaNacimiento);

    // Primero los chequeos baratos (409) y recién después la subida de la foto.
    await this.verificarDisponible(datos.correo, datos.username);
    const subida = foto
      ? await this.imagenes.subir(
          await this.imagenes.normalizar(foto),
          'maxify/perfiles',
        )
      : undefined;

    try {
      return await this.crear({
        nombre: datos.nombre,
        apellido: datos.apellido,
        correo: datos.correo,
        username: datos.username,
        // Nunca se guarda la contraseña: solo su hash con bcrypt (incluye salt).
        passwordHash: await bcrypt.hash(datos.password, RONDAS_BCRYPT),
        fechaNacimiento,
        descripcion: datos.descripcion ?? '',
        imagenUrl: subida?.url ?? '',
        imagenPublicId: subida?.publicId,
        perfil,
      });
    } catch (error) {
      // Si falla el alta, no dejamos la imagen huérfana en Cloudinary.
      await this.imagenes.eliminar(subida?.publicId);
      throw error;
    }
  }

  // Lanza 409 si el correo o el nombre de usuario ya están registrados.
  // Se llama antes de subir la foto para no subir imágenes de más.
  async verificarDisponible(correo: string, username: string): Promise<void> {
    if (await this.modelo.exists({ correo: correo.toLowerCase() }))
      throw this.conflicto('correo', 'Ese correo ya está registrado');
    if (await this.modelo.exists({ username: username.toLowerCase() }))
      throw this.conflicto('username', 'Ese nombre de usuario ya está en uso');
  }

  async crear(datos: NuevoUsuario): Promise<Usuario> {
    const { passwordHash, ...resto } = datos;
    try {
      const usuario = await this.modelo.create({
        ...resto,
        password: passwordHash,
      });
      return this.presentar(usuario);
    } catch (error) {
      // 11000 = índice único violado (dos registros simultáneos con el mismo dato).
      if ((error as { code?: number }).code === 11000) {
        const campo = Object.keys(
          (error as { keyPattern?: object }).keyPattern ?? {},
        )[0];
        throw campo === 'correo'
          ? this.conflicto('correo', 'Ese correo ya está registrado')
          : this.conflicto('username', 'Ese nombre de usuario ya está en uso');
      }
      throw error;
    }
  }

  // Edición del perfil propio. Si llega una foto nueva, se sube y se borra la
  // anterior de Cloudinary (recién cuando el cambio quedó guardado).
  async actualizarPerfil(
    id: string,
    datos: ActualizarPerfilDto,
    foto?: Express.Multer.File,
  ): Promise<Usuario> {
    const usuario = await this.buscarPorId(id);
    if (!usuario) throw new NotFoundException('El usuario no existe');

    if (datos.nombre !== undefined) usuario.nombre = datos.nombre;
    if (datos.apellido !== undefined) usuario.apellido = datos.apellido;
    if (datos.descripcion !== undefined)
      usuario.descripcion = datos.descripcion;
    if (datos.fechaNacimiento !== undefined)
      usuario.fechaNacimiento = this.validarFechaNacimiento(
        datos.fechaNacimiento,
      );

    const fotoAnterior = usuario.imagenPublicId;
    const subida = foto
      ? await this.imagenes.subir(
          await this.imagenes.normalizar(foto),
          'maxify/perfiles',
        )
      : undefined;
    if (subida) {
      usuario.imagenUrl = subida.url;
      usuario.imagenPublicId = subida.publicId;
    }

    try {
      await usuario.save();
    } catch (error) {
      await this.imagenes.eliminar(subida?.publicId);
      throw error;
    }
    if (subida) await this.imagenes.eliminar(fotoAnterior);
    return this.presentar(usuario);
  }

  // Panel de administración: todos los usuarios, los más nuevos primero.
  async listar(): Promise<Usuario[]> {
    const usuarios = await this.modelo.find().sort({ createdAt: -1 }).exec();
    return usuarios.map((usuario) => this.presentar(usuario));
  }

  // Baja (activo = false) y alta (activo = true) lógicas.
  // Un administrador no puede deshabilitarse a sí mismo (se quedaría afuera).
  async cambiarActivo(
    id: string,
    activo: boolean,
    solicitanteId: string,
  ): Promise<Usuario> {
    if (!activo && id === solicitanteId)
      throw new ForbiddenException('No podés deshabilitar tu propia cuenta');
    const usuario = await this.buscarPorId(id);
    if (!usuario) throw new NotFoundException('El usuario no existe');
    usuario.activo = activo;
    await usuario.save();
    return this.presentar(usuario);
  }

  // Busca por correo o por nombre de usuario e incluye el hash para el login.
  buscarParaLogin(identificador: string): Promise<UsuarioDocument | null> {
    const valor = identificador.trim().toLowerCase();
    return this.modelo
      .findOne({ $or: [{ correo: valor }, { username: valor }] })
      .select('+password')
      .exec();
  }

  buscarPorId(id: string): Promise<UsuarioDocument | null> {
    if (!isObjectIdOrHexString(id)) return Promise.resolve(null);
    return this.modelo.findById(id).exec();
  }

  presentar(usuario: UsuarioDocument): Usuario {
    return {
      id: usuario._id.toString(),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      username: usuario.username,
      fechaNacimiento: usuario.fechaNacimiento.toISOString().slice(0, 10),
      descripcion: usuario.descripcion,
      imagenUrl: usuario.imagenUrl,
      perfil: usuario.perfil,
      activo: usuario.activo,
      creadoEn: usuario.createdAt.toISOString(),
    };
  }

  private validarFechaNacimiento(texto: string): Date {
    const fecha = new Date(`${texto}T00:00:00.000Z`);
    const hoy = new Date();
    if (fecha > hoy)
      throw new BadRequestException(
        'La fecha de nacimiento no puede ser futura',
      );
    const limite = new Date(hoy);
    limite.setUTCFullYear(hoy.getUTCFullYear() - EDAD_MINIMA);
    if (fecha > limite)
      throw new BadRequestException(
        `Tenés que tener al menos ${EDAD_MINIMA} años`,
      );
    return fecha;
  }

  // El campo permite al front marcar el input que está repetido.
  private conflicto(campo: 'correo' | 'username', message: string) {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message,
      campo,
    });
  }
}
