import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

// Los query params llegan como texto: se convierten a número solo si son
// dígitos (igual que en la clase 11); si no, el validador responde 400.
const aNumero = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

export const ORDENES = ['fecha', 'likes'] as const;
export type Orden = (typeof ORDENES)[number];

// GET /publicaciones?orden=fecha|likes&usuario=<id>&offset=0&limit=5
export class ListarPublicacionesDto {
  @IsIn(ORDENES, { message: 'El orden debe ser "fecha" o "likes"' })
  @IsOptional()
  orden: Orden = 'fecha';

  // Filtra por autor (id de usuario).
  @IsMongoId({ message: 'El usuario no es válido' })
  @IsOptional()
  usuario?: string;

  // Cuántas publicaciones saltear (las que el front ya tiene).
  @Min(0, { message: 'offset no puede ser negativo' })
  @IsInt({ message: 'offset debe ser un número entero' })
  @IsOptional()
  @Transform(aNumero)
  offset: number = 0;

  // Cuántas publicaciones traer (máximo 20 por pedido).
  @Max(20, { message: 'limit puede ser como máximo 20' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @IsInt({ message: 'limit debe ser un número entero' })
  @IsOptional()
  @Transform(aNumero)
  limit: number = 5;

  // Cuántos comentarios (los más recientes) incluir por publicación.
  // Lo usa Mi perfil; el feed no los pide (0 = ninguno).
  @Max(10, { message: 'comentarios puede ser como máximo 10' })
  @Min(0, { message: 'comentarios no puede ser negativo' })
  @IsInt({ message: 'comentarios debe ser un número entero' })
  @IsOptional()
  @Transform(aNumero)
  comentarios: number = 0;
}
