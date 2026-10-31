import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { UsuarioToken } from '../auth/usuario-token';
import { ImagenesInterceptor } from '../imagenes/imagenes.interceptor';
import { MAX_IMAGEN_BYTES } from '../imagenes/imagenes.service';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import { PublicacionesService } from './publicaciones.service';

// Todas las rutas exigen token (JwtAuthGuard global): el usuario del token
// es el autor al crear y el que da o quita "me gusta".
@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  // multipart/form-data: título, mensaje y el archivo "imagen" (opcional).
  // POST sin @HttpCode → 201 Created.
  @Post()
  @UseInterceptors(
    ImagenesInterceptor,
    FileInterceptor('imagen', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_IMAGEN_BYTES,
        files: 1,
        fields: 2,
        parts: 3,
        fieldSize: 4096,
        fieldNameSize: 100,
      },
    }),
  )
  crear(
    @Body() datos: CrearPublicacionDto,
    @UsuarioActual() usuario: UsuarioToken,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.publicacionesService.crear(datos, usuario, imagen);
  }

  // GET /publicaciones?orden=fecha|likes&usuario=<id>&offset=0&limit=5
  @Get()
  listar(
    @Query() filtros: ListarPublicacionesDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.publicacionesService.listar(filtros, usuario);
  }

  // Baja lógica (solo el autor o un administrador). Sin contenido → 204.
  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string, @UsuarioActual() usuario: UsuarioToken) {
    return this.publicacionesService.eliminar(id, usuario);
  }

  // Crea el "me gusta" → 201. Si ya lo había dado → 409.
  @Post(':id/like')
  darMeGusta(@Param('id') id: string, @UsuarioActual() usuario: UsuarioToken) {
    return this.publicacionesService.darMeGusta(id, usuario);
  }

  // Quita el "me gusta" → 200. Si no lo había dado → 404.
  @Delete(':id/like')
  quitarMeGusta(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.publicacionesService.quitarMeGusta(id, usuario);
  }
}
