import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Recorta espacios al principio y al final (multipart envía todo como texto).
const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const MAX_TITULO = 100;
export const MAX_MENSAJE = 1000;

// La imagen (opcional) no forma parte del DTO: llega como archivo "imagen".
// Los decoradores se evalúan de abajo hacia arriba (ver registro.dto.ts).
export class CrearPublicacionDto {
  @MaxLength(MAX_TITULO, {
    message: `El título puede tener hasta ${MAX_TITULO} caracteres`,
  })
  @MinLength(1, { message: 'Escribí un título' })
  @IsString({ message: 'Escribí un título' })
  @Transform(recortar)
  titulo!: string;

  @MaxLength(MAX_MENSAJE, {
    message: `El mensaje puede tener hasta ${MAX_MENSAJE} caracteres`,
  })
  @Matches(/\S/, { message: 'Escribí un mensaje para poder publicar' })
  @IsString({ message: 'Escribí un mensaje para poder publicar' })
  @Transform(recortar)
  mensaje!: string;
}
