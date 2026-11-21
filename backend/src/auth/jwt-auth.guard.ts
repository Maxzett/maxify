import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { cuentaDeshabilitada } from './cuenta-deshabilitada';
import type { Request } from 'express';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ES_PUBLICA } from './publico.decorator';
import type { UsuarioToken } from './usuario-token';

// Petición con el usuario del token ya validado.
export interface RequestConUsuario extends Request {
  usuario?: UsuarioToken;
}

// Guard global (se registra en AuthModule con APP_GUARD): toda ruta exige un
// token válido en el header "Authorization: Bearer <token>", salvo las
// marcadas con @Publico(). Sin token o con token vencido/inválido → 401.
// Además comprueba que la cuenta siga habilitada: si un administrador la
// deshabilita, el próximo pedido responde 403 aunque el token no haya vencido.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly usuarios: UsuariosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Publico() puede estar en el método o en todo el controller.
    const publica = this.reflector.getAllAndOverride<boolean>(ES_PUBLICA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publica) return true;

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token)
      throw new UnauthorizedException('Falta el token de acceso');

    let usuario: UsuarioToken;
    try {
      // verifyAsync comprueba la firma con JWT_SECRET y el vencimiento.
      usuario = await this.jwt.verifyAsync<UsuarioToken>(token);
    } catch {
      throw new UnauthorizedException('El token es inválido o venció');
    }

    const documento = await this.usuarios.buscarPorId(usuario.sub);
    if (!documento) throw new UnauthorizedException('La cuenta ya no existe');
    if (!documento.activo) throw cuentaDeshabilitada();
    request.usuario = usuario;
    return true;
  }
}
