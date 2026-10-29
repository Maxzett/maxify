import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, MatButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  cerrarSesion(): void {
    this.notificaciones
      .confirmar({
        titulo: '¿Cerrar sesión?',
        mensaje: 'Vas a tener que volver a ingresar con tu correo o usuario.',
        icono: 'salir',
        textoCancelar: 'Cancelar',
        textoConfirmar: 'Cerrar sesión',
      })
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.auth.cerrarSesion();
        this.notificaciones.exito('Cerraste sesión. ¡Hasta pronto!');
        this.router.navigate(['/login']);
      });
  }
}
