import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ComentarioMongo, ComentarioSchema } from './comentario.schema';
import { LikeMongo, LikeSchema } from './like.schema';
import { PublicacionMongo, PublicacionSchema } from './publicacion.schema';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublicacionMongo.name, schema: PublicacionSchema },
      { name: LikeMongo.name, schema: LikeSchema },
      { name: ComentarioMongo.name, schema: ComentarioSchema },
    ]),
    // Registra el modelo de usuarios, necesario para populate('autor').
    UsuariosModule,
    // Subida de la imagen de la publicación a Cloudinary.
    ImagenesModule,
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
})
export class PublicacionesModule {}
