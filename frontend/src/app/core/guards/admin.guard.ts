import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificacionesService } from '../services/notificaciones.service';

// Dashboard: solo administradores (mismo estilo que authAdminGuard de clase).
// Va después de authGuard en canActivate, así que acá ya hay sesión validada.
// El backend vuelve a controlar el perfil en cada pedido (403).
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.esAdmin()) return true;
  inject(NotificacionesService).error('Esa sección es solo para administradores.');
  return router.createUrlTree(['/publicaciones']);
};
