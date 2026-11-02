import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestConUsuario } from './jwt-auth.guard';
import type { UsuarioToken } from './usuario-token';

// @UsuarioActual() en un parámetro del controller devuelve el usuario del
// token, que el JwtAuthGuard dejó en request.usuario.
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, context: ExecutionContext): UsuarioToken => {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    return request.usuario!;
  },
);
