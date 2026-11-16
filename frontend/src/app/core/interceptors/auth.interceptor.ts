import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionesService } from '../services/notificaciones.service';

// Login y registro no llevan token: un 401 ahí es "contraseña incorrecta".
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro'];

// Interceptor funcional (mismo estilo que los guards CanActivateFn de clase):
// agrega el token a cada pedido a la API y, ante cualquier 401 (token
// vencido o inválido), cierra la sesión y vuelve al login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificaciones = inject(NotificacionesService);

  const token = auth.token;
  const esPublica = RUTAS_PUBLICAS.some((ruta) => req.url.endsWith(ruta));
  const pedido =
    token && !esPublica ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(pedido).pipe(
    catchError((error: HttpErrorResponse) => {
      // auth.token se vuelve a leer: si varios pedidos fallan juntos, solo el
      // primero cierra la sesión y muestra el aviso.
      if (error.status === 401 && !esPublica && auth.token) {
        auth.cerrarSesion();
        notificaciones.error('Tu sesión venció. Iniciá sesión de nuevo.');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
