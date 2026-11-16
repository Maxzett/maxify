import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export const MAX_COMENTARIO = 500;

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Body de POST /publicaciones/:id/comentarios y de PUT /comentarios/:id.
// Los decoradores se evalúan de abajo hacia arriba (ver registro.dto.ts).
export class ComentarioDto {
  @MaxLength(MAX_COMENTARIO, {
    message: `El comentario puede tener hasta ${MAX_COMENTARIO} caracteres`,
  })
  @Matches(/\S/, { message: 'Escribí un comentario' })
  @IsString({ message: 'Escribí un comentario' })
  @Transform(recortar)
  mensaje!: string;
}
