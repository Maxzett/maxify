import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

// Duración del token. La consigna pide 15 minutos; para la corrección final
// el docente pidió 3 minutos (el front avisa 1 minuto antes de que venza).
export const DURACION_TOKEN = '3m';

@Module({
  imports: [
    UsuariosModule,
    ImagenesModule,
    // registerAsync: el secreto se lee cuando arranca la app, después de
    // que app.module cargó el .env.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: DURACION_TOKEN },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Guard global: todas las rutas piden token salvo las marcadas @Publico().
    // Se ejecutan en este orden: primero el token, después el perfil.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
