import { SetMetadata } from '@nestjs/common';
import type { Perfil } from '../usuarios/usuario.schema';

export const ROLES = 'roles';

// @Roles('administrador') en un método o en todo el controller: el RolesGuard
// solo deja pasar a los usuarios con alguno de esos perfiles (si no → 403).
export const Roles = (...perfiles: Perfil[]) => SetMetadata(ROLES, perfiles);
