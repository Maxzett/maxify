import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { UsuarioToken } from '../auth/usuario-token';
import { ComentariosService } from './comentarios.service';
import { ComentarioDto } from './dto/comentario.dto';
import { ListarComentariosDto } from './dto/listar-comentarios.dto';

// Sin prefijo propio: los comentarios se crean y listan colgados de su
// publicación, y se editan por su propio id. Todas las rutas exigen token.
@Controller()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  // GET /publicaciones/:id/comentarios?offset=0&limit=5 → más recientes primero.
  @Get('publicaciones/:id/comentarios')
  listar(@Param('id') id: string, @Query() filtros: ListarComentariosDto) {
    return this.comentariosService.listar(id, filtros);
  }

  // POST sin @HttpCode → 201 Created.
  @Post('publicaciones/:id/comentarios')
  crear(
    @Param('id') id: string,
    @Body() datos: ComentarioDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.comentariosService.crear(id, datos, usuario);
  }

  // Edita el mensaje (solo el autor; si no, 403) y marca modificado: true.
  @Put('comentarios/:id')
  editar(
    @Param('id') id: string,
    @Body() datos: ComentarioDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.comentariosService.editar(id, datos, usuario);
  }
}
