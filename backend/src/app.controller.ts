import { Controller, Get } from '@nestjs/common';

// Ruta raíz: sirve para comprobar que la API está levantada
// (Render la usa como health check).
@Controller()
export class AppController {
  @Get()
  estado() {
    return { app: 'Maxify API', estado: 'ok' };
  }
}
