import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ImagenesService } from '../imagenes/imagenes.service';
import type { Usuario } from '../usuarios/usuario';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import type { UsuarioToken } from './usuario-token';

// Respuesta de login y registro.
export interface Sesion {
  token: string;
  usuario: Usuario;
}

const RONDAS_BCRYPT = 10;
const EDAD_MINIMA = 13;

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly imagenes: ImagenesService,
    private readonly jwt: JwtService,
  ) {}

  async registrar(
    datos: RegistroDto,
    foto?: Express.Multer.File,
  ): Promise<Sesion> {
    if (datos.password !== datos.repetirPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    const fechaNacimiento = this.validarFechaNacimiento(datos.fechaNacimiento);

    // Primero los chequeos baratos (409) y recién después la subida de la foto.
    await this.usuarios.verificarDisponible(datos.correo, datos.username);
    const subida = foto
      ? await this.imagenes.subir(
          await this.imagenes.normalizar(foto),
          'maxify/perfiles',
        )
      : undefined;

    try {
      const usuario = await this.usuarios.crear({
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
      });
      return { token: this.firmarToken(usuario), usuario };
    } catch (error) {
      // Si falla el alta, no dejamos la imagen huérfana en Cloudinary.
      await this.imagenes.eliminar(subida?.publicId);
      throw error;
    }
  }

  async login(datos: LoginDto): Promise<Sesion> {
    const documento = await this.usuarios.buscarParaLogin(datos.identificador);
    // bcrypt.compare vuelve a calcular el hash con el salt guardado y compara.
    const coincide =
      documento !== null &&
      (await bcrypt.compare(datos.password, documento.password));
    // Mismo mensaje para usuario inexistente y contraseña incorrecta:
    // así no se revela qué cuentas existen.
    if (!documento || !coincide)
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    if (!documento.activo)
      throw new ForbiddenException('Tu cuenta fue deshabilitada');
    const usuario = this.usuarios.presentar(documento);
    return { token: this.firmarToken(usuario), usuario };
  }

  // El token lleva la identidad y el rol; vence a los 15 minutos (JwtModule).
  // Lo valida el JwtAuthGuard en todas las rutas que no son @Publico().
  private firmarToken(usuario: Usuario): string {
    const payload: UsuarioToken = {
      sub: usuario.id,
      correo: usuario.correo,
      username: usuario.username,
      perfil: usuario.perfil,
    };
    return this.jwt.sign(payload);
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
}
