import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/roles.decorator';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { UsuarioToken } from '../auth/usuario-token';
import { ImagenesInterceptor } from '../imagenes/imagenes.interceptor';
import { MAX_IMAGEN_BYTES } from '../imagenes/imagenes.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuariosService } from './usuarios.service';

// Misma configuración de Multer que el registro (campo "foto", opcional).
const subidaFoto = () =>
  FileInterceptor('foto', {
    storage: memoryStorage(),
    limits: {
      fileSize: MAX_IMAGEN_BYTES,
      files: 1,
      fields: 11,
      parts: 13,
      fieldSize: 4096,
      fieldNameSize: 100,
    },
  });

// Todas las rutas exigen token (JwtAuthGuard global). Las de administración
// llevan además @Roles('administrador') → 403 si el token es de un usuario.
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Edición del perfil propio (el id sale del token, no de la URL) → 200.
  @Patch('me')
  @UseInterceptors(ImagenesInterceptor, subidaFoto())
  actualizarPerfil(
    @Body() datos: ActualizarPerfilDto,
    @UsuarioActual() usuario: UsuarioToken,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.usuariosService.actualizarPerfil(usuario.sub, datos, foto);
  }

  // Listado de usuarios (solo administradores).
  @Get()
  @Roles('administrador')
  listar() {
    return this.usuariosService.listar();
  }

  // Alta de un usuario eligiendo su perfil → 201 Created.
  @Post()
  @Roles('administrador')
  @UseInterceptors(ImagenesInterceptor, subidaFoto())
  crear(
    @Body() datos: CrearUsuarioDto,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.usuariosService.registrar(datos, foto, datos.perfil);
  }

  // Baja lógica: el usuario ya no puede ingresar → 200 con el usuario.
  @Delete(':id')
  @Roles('administrador')
  deshabilitar(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.usuariosService.cambiarActivo(id, false, usuario.sub);
  }

  // Alta lógica: vuelve a habilitar la cuenta. No crea nada → 200.
  @Post(':id/habilitar')
  @Roles('administrador')
  @HttpCode(200)
  habilitar(@Param('id') id: string, @UsuarioActual() usuario: UsuarioToken) {
    return this.usuariosService.cambiarActivo(id, true, usuario.sub);
  }
}
