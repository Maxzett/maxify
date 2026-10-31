import { Controller, Get } from '@nestjs/common';
import { Publico } from './auth/publico.decorator';

// Ruta raíz: sirve para comprobar que la API está levantada
// (Render la usa como health check).
@Controller()
export class AppController {
  @Publico()
  @Get()
  estado() {
    return { app: 'Maxify API', estado: 'ok' };
  }
}
