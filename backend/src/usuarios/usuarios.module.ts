import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuarioMongo, UsuarioSchema } from './usuario.schema';
import { UsuariosService } from './usuarios.service';

// En este sprint el módulo solo expone el servicio que usa auth.
// Los endpoints de perfil y de administración se agregan en los próximos sprints.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsuarioMongo.name, schema: UsuarioSchema },
    ]),
  ],
  providers: [UsuariosService],
  exports: [UsuariosService, MongooseModule],
})
export class UsuariosModule {}
