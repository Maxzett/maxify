import { ForbiddenException } from '@nestjs/common';

// 403 con un código fijo: el front lo distingue de otros 403 (por ejemplo,
// "no sos el autor") para cerrar la sesión y avisar con un modal.
export function cuentaDeshabilitada(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: 'Forbidden',
    message: 'Tu cuenta fue deshabilitada por un administrador',
    codigo: 'CUENTA_DESHABILITADA',
  });
}
