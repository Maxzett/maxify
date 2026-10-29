import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ImagenesService } from '../imagenes/imagenes.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';

describe('AuthService', () => {
  let servicio: AuthService;
  const usuarios = {
    verificarDisponible: jest.fn(),
    crear: jest.fn(),
    buscarParaLogin: jest.fn(),
    presentar: jest.fn(),
  };
  const imagenes = {
    normalizar: jest.fn(),
    subir: jest.fn(),
    eliminar: jest.fn(),
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
        { provide: ImagenesService, useValue: imagenes },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    servicio = modulo.get(AuthService);
  });

  it('rechaza el registro si las contraseñas no coinciden (400)', async () => {
    await expect(
      servicio.registrar({ ...registro, repetirPassword: 'Otra1234' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usuarios.crear).not.toHaveBeenCalled();
  });

  it('guarda el hash de la contraseña, nunca el texto plano', async () => {
    usuarios.crear.mockImplementation((datos: { passwordHash: string }) =>
      Promise.resolve({ id: '1', perfil: 'usuario', ...datos }),
    );
    await servicio.registrar(registro);
    const [[{ passwordHash }]] = usuarios.crear.mock.calls as [
      [{ passwordHash: string }],
    ];
    expect(passwordHash).not.toBe('Clave1234');
    await expect(bcrypt.compare('Clave1234', passwordHash)).resolves.toBe(true);
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
