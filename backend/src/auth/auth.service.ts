import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { cuentaDeshabilitada } from './cuenta-deshabilitada';
import * as bcrypt from 'bcrypt';
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

// Respuesta de /auth/refrescar.
export interface TokenRefrescado {
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
  ) {}

  // La validación, el hash y la foto los resuelve UsuariosService (también lo
  // usa el alta de usuarios del panel de administración).
  async registrar(
    datos: RegistroDto,
    foto?: Express.Multer.File,
  ): Promise<Sesion> {
    const usuario = await this.usuarios.registrar(datos, foto);
    return { token: this.firmarToken(usuario), usuario };
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
    if (!documento.activo) throw cuentaDeshabilitada();
    const usuario = this.usuarios.presentar(documento);
    return { token: this.firmarToken(usuario), usuario };
  }

  // El guard ya validó firma y vencimiento; además se comprueba que la cuenta
  // siga existiendo y habilitada (pudo cambiar después de emitir el token).
  async autorizar(token: UsuarioToken): Promise<Usuario> {
    const documento = await this.usuarios.buscarPorId(token.sub);
    if (!documento) throw new UnauthorizedException('La cuenta ya no existe');
    if (!documento.activo) throw cuentaDeshabilitada();
    return this.usuarios.presentar(documento);
  }

  // Mismo payload (identidad y rol) firmado de nuevo: otros 3 minutos (DURACION_TOKEN).
  // Se arma explícitamente para no copiar iat/exp del token anterior.
  async refrescar(token: UsuarioToken): Promise<TokenRefrescado> {
    await this.autorizar(token);
    const payload: UsuarioToken = {
      sub: token.sub,
      correo: token.correo,
      username: token.username,
      perfil: token.perfil,
    };
    return { token: this.jwt.sign(payload) };
  }

  // El token lleva la identidad y el rol; vence según DURACION_TOKEN (AuthModule).
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
}
