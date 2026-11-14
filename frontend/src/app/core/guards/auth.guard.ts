import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Páginas que solo se ven logueado (mismo estilo que el authGuard de clase).
// - Sin token → login.
// - Con token que todavía no se validó en esta carga de la app (por ejemplo,
//   al recargar la página) → pantalla Cargando, que lo valida contra
//   /auth/autorizar y después vuelve a la página pedida.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token) return router.createUrlTree(['/login']);
  if (!auth.validada()) {
    return router.createUrlTree(['/cargando'], { queryParams: { volver: state.url } });
  }
  return true;
};
