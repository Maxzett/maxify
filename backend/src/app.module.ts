import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PublicacionesModule } from './publicaciones/publicaciones.module';
import { UsuariosModule } from './usuarios/usuarios.module';

// Node 22+ carga las variables antes de configurar la conexión a Atlas.
// En Render no hay archivo .env: las variables vienen del panel del servicio.
if (existsSync('.env')) loadEnvFile('.env');

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error(
    'Configurá MONGODB_URI en .env con la conexión de MongoDB Atlas',
  );
}
if (!process.env.JWT_SECRET) {
  throw new Error('Configurá JWT_SECRET en .env');
}

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri),
    AuthModule,
    UsuariosModule,
    PublicacionesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
