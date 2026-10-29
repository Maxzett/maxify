import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsuariosModule,
    ImagenesModule,
    // registerAsync: el secreto se lee cuando arranca la app, después de
    // que app.module cargó el .env.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
