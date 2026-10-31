import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionesService } from '../services/notificaciones.service';

// Interceptor funcional (mismo estilo que los guards CanActivateFn de clase):
// agrega el token a cada pedido a la API y, si la API responde 401 (token
// vencido o inválido), cierra la sesión y vuelve al login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificaciones = inject(NotificacionesService);

  const token = auth.token;
  // Login y registro no llevan token: un 401 ahí es "contraseña incorrecta".
  const esAuth = req.url.includes('/auth/');
  const pedido =
    token && !esAuth ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(pedido).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !esAuth) {
        auth.cerrarSesion();
        notificaciones.error('Tu sesión venció. Iniciá sesión de nuevo.');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
