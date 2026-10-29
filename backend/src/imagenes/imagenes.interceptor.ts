import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { finalize } from 'rxjs';

// Igual que el PortadasInterceptor de la clase 11: se ejecuta antes de Multer
// y limita cuántas subidas se procesan a la vez en esta instancia.
@Injectable()
export class ImagenesInterceptor implements NestInterceptor {
  private activas = 0;

  intercept(_context: ExecutionContext, next: CallHandler) {
    if (this.activas >= 4)
      throw new ServiceUnavailableException(
        'Demasiadas subidas simultáneas; reintentá más tarde',
      );
    this.activas++;
    // finalize libera el lugar cuando la petición termina, falla o se cancela.
    return next.handle().pipe(finalize(() => this.activas--));
  }
}
