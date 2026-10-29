import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PublicacionMongo, PublicacionSchema } from './publicacion.schema';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublicacionMongo.name, schema: PublicacionSchema },
    ]),
    // Registra el modelo de usuarios, necesario para populate('autor').
    UsuariosModule,
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
})
export class PublicacionesModule {}
