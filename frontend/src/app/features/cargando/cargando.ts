import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';

// Pantalla inicial: valida el token guardado contra /auth/autorizar.
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

  // Error de conexión: se ofrece reintentar en vez de mandar al login.
  sinConexion = signal(false);

  ngOnInit(): void {
    this.validar();
  }

  validar(): void {
    if (!this.auth.token) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.sinConexion.set(false);
    this.auth.autorizar().subscribe({
      next: () => this.router.navigateByUrl(this.destino(), { replaceUrl: true }),
      error: (error: HttpErrorResponse) => {
        if (error.status === 0) {
          this.sinConexion.set(true);
          return;
        }
        // 401 ya lo maneja el interceptor (cierra sesión y avisa).
        if (error.status === 403)
          this.notificaciones.error('Tu cuenta fue deshabilitada. No podés ingresar.');
        else if (error.status !== 401)
          this.notificaciones.error(this.notificaciones.mensajeDeError(error));
        this.auth.cerrarSesion();
        this.router.navigate(['/login'], { replaceUrl: true });
      },
    });
  }

  // Solo rutas internas (empiezan con una sola "/") y nunca la propia Cargando.
  private destino(): string {
    const volver = this.volver();
    const valida = volver?.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/cargando');
    return valida ? volver! : '/publicaciones';
  }
}
