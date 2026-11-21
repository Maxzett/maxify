import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImagenesInterceptor } from '../imagenes/imagenes.interceptor';
import { MAX_IMAGEN_BYTES } from '../imagenes/imagenes.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { Publico } from './publico.decorator';
import { UsuarioActual } from './usuario-actual.decorator';
import type { UsuarioToken } from './usuario-token';

// Registro y login son públicos (el usuario todavía no tiene token).
// Autorizar y refrescar pasan por el JwtAuthGuard global: si el token falta,
// es inválido o venció, el guard responde 401 antes de llegar al método.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // multipart/form-data: los datos del formulario + el archivo "foto" (opcional).
  // POST sin @HttpCode → 201 Created.
  @Publico()
  @Post('registro')
  @UseInterceptors(
    ImagenesInterceptor,
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_IMAGEN_BYTES,
        files: 1,
        fields: 10,
        parts: 12,
        fieldSize: 4096,
        fieldNameSize: 100,
      },
    }),
  )
  registrar(
    @Body() datos: RegistroDto,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.authService.registrar(datos, foto);
  }

  // El login no crea nada: responde 200 OK.
  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() datos: LoginDto) {
    return this.authService.login(datos);
  }

  // Lo usa la pantalla "Cargando" del front: si el token es válido devuelve
  // los datos actualizados del usuario (200); si no, el guard ya respondió 401.
  @Post('autorizar')
  @HttpCode(200)
  autorizar(@UsuarioActual() usuario: UsuarioToken) {
    return this.authService.autorizar(usuario);
  }

  // Devuelve un token nuevo con el mismo payload y otros 3 minutos.
  @Post('refrescar')
  @HttpCode(200)
  refrescar(@UsuarioActual() usuario: UsuarioToken) {
    return this.authService.refrescar(usuario);
  }
}
