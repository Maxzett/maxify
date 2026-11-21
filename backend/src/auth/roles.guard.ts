import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Perfil } from '../usuarios/usuario.schema';
import type { RequestConUsuario } from './jwt-auth.guard';
import { ROLES } from './roles.decorator';

// Guard global que corre después del JwtAuthGuard: si la ruta tiene @Roles(),
// el perfil del token tiene que estar en la lista. Autenticado pero sin el
// perfil necesario → 403 Forbidden (no 401: el token es válido).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfiles = this.reflector.getAllAndOverride<Perfil[] | undefined>(
      ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (!perfiles?.length) return true;
    const { usuario } = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!usuario || !perfiles.includes(usuario.perfil))
      throw new ForbiddenException(
        'Solo un administrador puede realizar esta acción',
      );
    return true;
  }
}
