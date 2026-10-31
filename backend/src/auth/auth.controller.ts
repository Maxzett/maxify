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

// Registro y login no piden token (todavía no lo tiene el usuario).
@Publico()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // multipart/form-data: los datos del formulario + el archivo "foto" (opcional).
  // POST sin @HttpCode → 201 Created.
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
  @Post('login')
  @HttpCode(200)
  login(@Body() datos: LoginDto) {
    return this.authService.login(datos);
  }
}
