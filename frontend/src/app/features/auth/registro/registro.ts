import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { FormularioUsuario } from '../../../shared/components/formulario-usuario/formulario-usuario';

// Registro público: siempre crea una cuenta con perfil "usuario".
// Los campos y validaciones están en FormularioUsuario (compartido con el
// alta de usuarios del dashboard y con Editar perfil).
@Component({
  selector: 'app-registro',
  imports: [RouterLink, FormularioUsuario],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  private formulario = viewChild.required(FormularioUsuario);
  cargando = signal(false);

  avisarErrores(): void {
    this.notificaciones.error('Revisá los campos marcados en rojo.');
  }

  crearCuenta(datos: FormData): void {
    this.cargando.set(true);
    this.auth.registrar(datos).subscribe({
      // Igual que el login: se entra por la pantalla de carga.
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/cargando'], {
          queryParams: { saludo: 'bienvenida' },
          replaceUrl: true,
        });
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        const mensaje = this.notificaciones.mensajeDeError(error);
        const campo = error.error?.campo as 'correo' | 'username' | undefined;
        if (error.status === 409 && campo) this.formulario().marcarEnUso(campo, mensaje);
        this.notificaciones.error(mensaje);
      },
    });
  }
}
