import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Login y registro: solo sin sesión. Si ya hay un token, va a Publicaciones
// (el authGuard se encarga de validarlo si hace falta).
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.token ? router.createUrlTree(['/publicaciones']) : true;
};
