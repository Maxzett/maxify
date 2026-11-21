import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuarioMongo, UsuarioSchema } from './usuario.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

// Perfil propio (editar) y administración de usuarios. El servicio también
// lo usan auth (registro y login) y el JwtAuthGuard (cuenta habilitada).
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsuarioMongo.name, schema: UsuarioSchema },
    ]),
    // Foto de perfil en Cloudinary.
    ImagenesModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService, MongooseModule],
})
export class UsuariosModule {}
