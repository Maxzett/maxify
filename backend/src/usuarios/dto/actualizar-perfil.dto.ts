import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// PATCH /usuarios/me (multipart). Todos los campos son opcionales: solo se
// cambia lo que llega. Correo y nombre de usuario no se editan porque viajan
// dentro del token; la foto llega como archivo aparte ("foto").
export class ActualizarPerfilDto {
  @Matches(/^[\p{L} '-]+$/u, { message: 'El nombre solo admite letras' })
  @MaxLength(50, { message: 'El nombre puede tener hasta 50 caracteres' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @IsString({ message: 'Ingresá tu nombre' })
  @IsOptional()
  @Transform(recortar)
  nombre?: string;

  @Matches(/^[\p{L} '-]+$/u, { message: 'El apellido solo admite letras' })
  @MaxLength(50, { message: 'El apellido puede tener hasta 50 caracteres' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @IsString({ message: 'Ingresá tu apellido' })
  @IsOptional()
  @Transform(recortar)
  apellido?: string;

  @IsDateString(
    { strict: true },
    { message: 'La fecha de nacimiento no es válida' },
  )
  @IsString({ message: 'Ingresá tu fecha de nacimiento' })
  @IsOptional()
  fechaNacimiento?: string;

  @MaxLength(200, {
    message: 'La descripción puede tener hasta 200 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  @Transform(recortar)
  descripcion?: string;
}
