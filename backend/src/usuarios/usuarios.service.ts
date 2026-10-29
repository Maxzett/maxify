import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(UsuarioMongo.name)
    private readonly modelo: Model<UsuarioMongo>,
  ) {}

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

  // Busca por correo o por nombre de usuario e incluye el hash para el login.
  buscarParaLogin(identificador: string): Promise<UsuarioDocument | null> {
    const valor = identificador.trim().toLowerCase();
    return this.modelo
      .findOne({ $or: [{ correo: valor }, { username: valor }] })
      .select('+password')
      .exec();
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
