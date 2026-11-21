import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { FormularioUsuario } from '../../../shared/components/formulario-usuario/formulario-usuario';

// Dashboard / Nuevo usuario: mismo formulario que el registro, con los radio
// buttons para elegir el perfil (usuario o administrador).
@Component({
  selector: 'app-nuevo-usuario',
  imports: [RouterLink, FormularioUsuario],
  templateUrl: './nuevo-usuario.html',
  styleUrl: './nuevo-usuario.scss',
})
export class NuevoUsuario {
  private usuarios = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  private formulario = viewChild.required(FormularioUsuario);
  guardando = signal(false);

  avisarErrores(): void {
    this.notificaciones.error('Revisá los campos marcados en rojo.');
  }

  crear(datos: FormData): void {
    this.guardando.set(true);
    this.usuarios.crear(datos).subscribe({
      next: (usuario) => {
        this.guardando.set(false);
        const perfil = usuario.perfil === 'administrador' ? 'administrador' : 'usuario';
        this.notificaciones.exito(`Creaste a @${usuario.username} con perfil ${perfil}.`);
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        const mensaje = this.notificaciones.mensajeDeError(error);
        const campo = error.error?.campo as 'correo' | 'username' | undefined;
        if (error.status === 409 && campo) this.formulario().marcarEnUso(campo, mensaje);
        this.notificaciones.error(mensaje);
      },
    });
  }
}
