import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { RegistroDto } from '../auth/dto/registro.dto';
import { ImagenesService } from '../imagenes/imagenes.service';
import { UsuarioMongo } from './usuario.schema';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let servicio: UsuariosService;
  const modelo = {
    exists: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  };
  const imagenes = {
    normalizar: jest.fn(),
    subir: jest.fn(),
    eliminar: jest.fn(),
  };

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
        UsuariosService,
        { provide: getModelToken(UsuarioMongo.name), useValue: modelo },
        { provide: ImagenesService, useValue: imagenes },
      ],
    }).compile();
    servicio = modulo.get(UsuariosService);
    // presentar() se prueba aparte: acá solo interesa lo que se guarda.
    jest
      .spyOn(servicio, 'presentar')
      .mockImplementation(
        (u) => u as unknown as ReturnType<UsuariosService['presentar']>,
      );
  });

  it('rechaza el registro si las contraseñas no coinciden (400)', async () => {
    await expect(
      servicio.registrar({ ...registro, repetirPassword: 'Otra1234' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(modelo.create).not.toHaveBeenCalled();
  });

  it('guarda el hash de la contraseña, nunca el texto plano', async () => {
    modelo.create.mockImplementation((datos: object) => Promise.resolve(datos));
    await servicio.registrar(registro);
    const [[{ password, perfil }]] = modelo.create.mock.calls as [
      [{ password: string; perfil: string }],
    ];
    expect(password).not.toBe('Clave1234');
    expect(perfil).toBe('usuario');
    await expect(bcrypt.compare('Clave1234', password)).resolves.toBe(true);
  });

  it('el administrador puede crear usuarios con perfil administrador', async () => {
    modelo.create.mockImplementation((datos: object) => Promise.resolve(datos));
    await servicio.registrar(registro, undefined, 'administrador');
    const [[{ perfil }]] = modelo.create.mock.calls as [[{ perfil: string }]];
    expect(perfil).toBe('administrador');
  });

  it('un administrador no puede deshabilitarse a sí mismo (403)', async () => {
    await expect(
      servicio.cambiarActivo('abc', false, 'abc'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
