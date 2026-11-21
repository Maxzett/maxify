import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';

// Tiempo mínimo en pantalla: la validación suele tardar milisegundos y la
// pantalla pasaría desapercibida (pedido del docente: 2 segundos).
const DURACION_MINIMA_MS = 2000;

// Pantalla de carga: solo el logo y un spinner mientras se valida el token
// contra /auth/autorizar. Aparece al abrir la app, al recargar y al entrar
// después del login o el registro.
// Válido → Publicaciones (o la página que se había pedido); inválido → Login.
@Component({
  selector: 'app-cargando',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './cargando.html',
  styleUrl: './cargando.scss',
})
export class Cargando implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notificaciones = inject(NotificacionesService);

  // ?volver=/publicacion/123 → página a la que ir después de validar
  // (llega como input gracias a withComponentInputBinding).
  volver = input<string>();
  // ?saludo=hola (login) o ?saludo=bienvenida (registro): al entrar se saluda
  // al usuario, recién cuando ya pasó por esta pantalla.
  saludo = input<string>();

  // Error de conexión: se ofrece reintentar en vez de mandar al login.
  sinConexion = signal(false);

  ngOnInit(): void {
    this.validar();
  }

  validar(): void {
    this.sinConexion.set(false);
    const inicio = Date.now();
    // Espera lo que falte para completar los 2 segundos y recién ahí sigue.
    const despues = (accion: () => void) =>
      setTimeout(accion, Math.max(DURACION_MINIMA_MS - (Date.now() - inicio), 0));

    if (!this.auth.token) {
      despues(() => this.irAlLogin());
      return;
    }
    // La validación corre en paralelo con la espera (no se suman los tiempos).
    this.auth.autorizar().subscribe({
      next: (usuario) =>
        despues(() => {
          this.router.navigateByUrl(this.destino(), { replaceUrl: true });
          if (this.saludo() === 'hola') this.notificaciones.exito(`¡Hola, ${usuario.nombre}!`);
          if (this.saludo() === 'bienvenida')
            this.notificaciones.exito(`¡Bienvenido/a a Maxify, ${usuario.nombre}!`);
        }),
      error: (error: HttpErrorResponse) =>
        despues(() => {
          if (error.status === 0) {
            this.sinConexion.set(true);
            return;
          }
          this.auth.cerrarSesion();
          if (error.status === 403) this.notificaciones.cuentaDeshabilitada();
          else if (error.status === 401)
            this.notificaciones.error('Tu sesión venció. Iniciá sesión de nuevo.');
          else this.notificaciones.error(this.notificaciones.mensajeDeError(error));
          this.irAlLogin();
        }),
    });
  }

  private irAlLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Solo rutas internas (empiezan con una sola "/") y nunca la propia Cargando.
  private destino(): string {
    const volver = this.volver();
    const valida =
      volver?.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/cargando');
    return valida ? volver! : '/publicaciones';
  }
}
