import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionesService } from '../services/notificaciones.service';

// Login y registro no llevan token: un 401 ahí es "contraseña incorrecta".
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro'];
// La pantalla Cargando resuelve sola los errores de /auth/autorizar (espera
// sus 2 segundos antes de ir al login), así que acá no se redirige.
const RUTAS_SIN_REDIRECCION = [...RUTAS_PUBLICAS, '/auth/autorizar'];

// Interceptor funcional (mismo estilo que los guards CanActivateFn de clase):
// agrega el token a cada pedido a la API y, ante un 401 (token vencido o
// inválido) o una cuenta deshabilitada, cierra la sesión y vuelve al login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificaciones = inject(NotificacionesService);

  const token = auth.token;
  const esPublica = RUTAS_PUBLICAS.some((ruta) => req.url.endsWith(ruta));
  const redirige = !RUTAS_SIN_REDIRECCION.some((ruta) => req.url.endsWith(ruta));
  const pedido =
    token && !esPublica ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(pedido).pipe(
    catchError((error: HttpErrorResponse) => {
      // auth.token se vuelve a leer: si varios pedidos fallan juntos, solo el
      // primero cierra la sesión y muestra el aviso.
      if (!redirige || !auth.token) return throwError(() => error);

      if (error.status === 401) {
        auth.cerrarSesion();
        notificaciones.error('Tu sesión venció. Iniciá sesión de nuevo.');
        router.navigate(['/login']);
      } else if (error.status === 403 && error.error?.codigo === 'CUENTA_DESHABILITADA') {
        auth.cerrarSesion();
        router.navigate(['/login']);
        notificaciones.cuentaDeshabilitada();
      }
      return throwError(() => error);
    }),
  );
};
