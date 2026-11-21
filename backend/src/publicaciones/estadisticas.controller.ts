import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RangoFechasDto } from './dto/rango-fechas.dto';
import { EstadisticasService } from './estadisticas.service';

// Rutas GET para los gráficos del dashboard. @Roles en el controller: todas
// exigen un token de administrador (usuario común → 403).
@Controller('estadisticas')
@Roles('administrador')
export class EstadisticasController {
  constructor(private readonly estadisticas: EstadisticasService) {}

  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(@Query() rango: RangoFechasDto) {
    return this.estadisticas.publicacionesPorUsuario(rango);
  }

  @Get('comentarios')
  comentariosPorDia(@Query() rango: RangoFechasDto) {
    return this.estadisticas.comentariosPorDia(rango);
  }

  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(@Query() rango: RangoFechasDto) {
    return this.estadisticas.comentariosPorPublicacion(rango);
  }
}
