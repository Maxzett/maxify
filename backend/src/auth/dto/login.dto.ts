import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Los decoradores se evalúan de abajo hacia arriba (ver registro.dto.ts).
export class LoginDto {
  // Puede ser el correo o el nombre de usuario.
  @MaxLength(100, { message: 'El correo o usuario es demasiado largo' })
  @IsNotEmpty({ message: 'Ingresá tu correo o nombre de usuario' })
  @IsString({ message: 'Ingresá tu correo o nombre de usuario' })
  identificador!: string;

  @MaxLength(64, { message: 'La contraseña es demasiado larga' })
  @IsNotEmpty({ message: 'Ingresá tu contraseña' })
  @IsString({ message: 'Ingresá tu contraseña' })
  password!: string;
}
