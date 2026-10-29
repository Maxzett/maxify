import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Recorta espacios al principio y al final (multipart envía todo como texto).
const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const minusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// Los decoradores se aplican de abajo hacia arriba: el que está pegado a la
// propiedad se evalúa primero. Con stopAtFirstError (main.ts) solo se informa
// el primer error de cada campo, por eso el chequeo básico va abajo.
//
// No incluye "perfil": con forbidNonWhitelisted, si alguien lo manda → 400.
// El registro público siempre crea usuarios con perfil "usuario".
export class RegistroDto {
  @Matches(/^[\p{L} '-]+$/u, { message: 'El nombre solo admite letras' })
  @MaxLength(50, { message: 'El nombre puede tener hasta 50 caracteres' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @IsString({ message: 'Ingresá tu nombre' })
  @Transform(recortar)
  nombre!: string;

  @Matches(/^[\p{L} '-]+$/u, { message: 'El apellido solo admite letras' })
  @MaxLength(50, { message: 'El apellido puede tener hasta 50 caracteres' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @IsString({ message: 'Ingresá tu apellido' })
  @Transform(recortar)
  apellido!: string;

  @MaxLength(100, { message: 'El correo puede tener hasta 100 caracteres' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsString({ message: 'Ingresá tu correo' })
  @Transform(minusculas)
  correo!: string;

  // Sin "@" para que el login pueda distinguir correo de usuario.
  @Matches(/^[a-z0-9._]{3,20}$/, {
    message:
      'El usuario debe tener de 3 a 20 caracteres: letras, números, punto o guion bajo',
  })
  @IsString({ message: 'Ingresá un nombre de usuario' })
  @Transform(minusculas)
  username!: string;

  @Matches(/\d/, { message: 'La contraseña debe tener un número' })
  @Matches(/[A-Z]/, { message: 'La contraseña debe tener una mayúscula' })
  @MaxLength(64, { message: 'La contraseña puede tener hasta 64 caracteres' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsString({ message: 'Ingresá una contraseña' })
  password!: string;

  @IsNotEmpty({ message: 'Repetí la contraseña' })
  @IsString({ message: 'Repetí la contraseña' })
  repetirPassword!: string;

  // Formato AAAA-MM-DD (el que envía <input type="date">).
  @IsDateString(
    { strict: true },
    { message: 'La fecha de nacimiento no es válida' },
  )
  @IsString({ message: 'Ingresá tu fecha de nacimiento' })
  fechaNacimiento!: string;

  @MaxLength(200, {
    message: 'La descripción puede tener hasta 200 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  @Transform(recortar)
  descripcion?: string;
}
