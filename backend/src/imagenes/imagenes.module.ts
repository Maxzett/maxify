import { Module } from '@nestjs/common';
import { ImagenesInterceptor } from './imagenes.interceptor';
import { ImagenesService } from './imagenes.service';

// Módulo compartido: lo importan auth (foto de perfil) y publicaciones.
@Module({
  providers: [ImagenesService, ImagenesInterceptor],
  exports: [ImagenesService, ImagenesInterceptor],
})
export class ImagenesModule {}
