import { IsIn } from 'class-validator';
import { RegistroDto } from '../../auth/dto/registro.dto';
import { PERFILES } from '../usuario.schema';
import type { Perfil } from '../usuario.schema';

// Alta de usuarios desde el panel de administración: mismos datos que el
// registro más el perfil elegido con los radio buttons.
export class CrearUsuarioDto extends RegistroDto {
  @IsIn(PERFILES, { message: 'El perfil debe ser "usuario" o "administrador"' })
  perfil!: Perfil;
}
