import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';

describe('AuthService', () => {
  let servicio: AuthService;
  const usuarios = {
    registrar: jest.fn(),
    buscarParaLogin: jest.fn(),
    presentar: jest.fn(),
  };
  const jwt = { sign: jest.fn().mockReturnValue('token-de-prueba') };

  const registro: RegistroDto = {
    nombre: 'Lucía',
    apellido: 'Méndez',
    correo: 'lucia@mail.com',
    username: 'lumendez',
    password: 'Clave1234',
    repetirPassword: 'Clave1234',
    fechaNacimiento: '2003-05-14',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const modulo = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: usuarios },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    servicio = modulo.get(AuthService);
  });

  it('el registro delega en UsuariosService y devuelve el token', async () => {
    usuarios.registrar.mockResolvedValue({ id: '1', perfil: 'usuario' });
    await expect(servicio.registrar(registro)).resolves.toEqual({
      token: 'token-de-prueba',
      usuario: { id: '1', perfil: 'usuario' },
    });
    expect(usuarios.registrar).toHaveBeenCalledWith(registro, undefined);
  });

  it('responde 401 si la contraseña es incorrecta', async () => {
    usuarios.buscarParaLogin.mockResolvedValue({
      password: await bcrypt.hash('Clave1234', 4),
      activo: true,
    });
    await expect(
      servicio.login({ identificador: 'lumendez', password: 'Mala1234' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 401 si el usuario no existe', async () => {
    usuarios.buscarParaLogin.mockResolvedValue(null);
    await expect(
      servicio.login({ identificador: 'nadie', password: 'Clave1234' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 403 si la cuenta está deshabilitada', async () => {
    usuarios.buscarParaLogin.mockResolvedValue({
      password: await bcrypt.hash('Clave1234', 4),
      activo: false,
    });
    await expect(
      servicio.login({ identificador: 'lumendez', password: 'Clave1234' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('devuelve token y usuario al ingresar', async () => {
    usuarios.buscarParaLogin.mockResolvedValue({
      password: await bcrypt.hash('Clave1234', 4),
      activo: true,
    });
    usuarios.presentar.mockReturnValue({ id: '1', username: 'lumendez' });
    await expect(
      servicio.login({ identificador: 'lumendez', password: 'Clave1234' }),
    ).resolves.toEqual({
      token: 'token-de-prueba',
      usuario: { id: '1', username: 'lumendez' },
    });
  });
});
