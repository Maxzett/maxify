import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ES_PUBLICA } from './publico.decorator';
import type { UsuarioToken } from './usuario-token';

// Petición con el usuario del token ya validado.
export interface RequestConUsuario extends Request {
  usuario?: UsuarioToken;
}

// Guard global (se registra en AuthModule con APP_GUARD): toda ruta exige un
// token válido en el header "Authorization: Bearer <token>", salvo las
// marcadas con @Publico(). Sin token o con token vencido/inválido → 401.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
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

    try {
      // verifyAsync comprueba la firma con JWT_SECRET y el vencimiento.
      request.usuario = await this.jwt.verifyAsync<UsuarioToken>(token);
    } catch {
      throw new UnauthorizedException('El token es inválido o venció');
    }
    return true;
  }
}
