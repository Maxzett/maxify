import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICA = 'esPublica';

// Marca una ruta (o un controller entero) como pública: el JwtAuthGuard
// la deja pasar sin token. Se usa en login, registro y el health check.
export const Publico = () => SetMetadata(ES_PUBLICA, true);
