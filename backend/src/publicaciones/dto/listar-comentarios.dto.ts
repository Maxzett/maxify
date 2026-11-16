import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Igual que en ListarPublicacionesDto: solo se convierten los dígitos.
const aNumero = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

// GET /publicaciones/:id/comentarios?offset=0&limit=5
export class ListarComentariosDto {
  // Cuántos comentarios saltear (los que el front ya muestra).
  @Min(0, { message: 'offset no puede ser negativo' })
  @IsInt({ message: 'offset debe ser un número entero' })
  @IsOptional()
  @Transform(aNumero)
  offset: number = 0;

  @Max(20, { message: 'limit puede ser como máximo 20' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @IsInt({ message: 'limit debe ser un número entero' })
  @IsOptional()
  @Transform(aNumero)
  limit: number = 5;
}
