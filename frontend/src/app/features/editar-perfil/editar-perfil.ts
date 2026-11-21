import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { FormularioUsuario } from '../../shared/components/formulario-usuario/formulario-usuario';

// Editar perfil: nombre, apellido, fecha de nacimiento, descripción y foto.
// Usa el mismo formulario que el registro, en modo "editar".
@Component({
  selector: 'app-editar-perfil',
  imports: [RouterLink, FormularioUsuario],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.scss',
})
export class EditarPerfil {
  auth = inject(AuthService);
  private usuarios = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  guardando = signal(false);

  avisarErrores(): void {
    this.notificaciones.error('Revisá los campos marcados en rojo.');
  }

  guardar(datos: FormData): void {
    this.guardando.set(true);
    this.usuarios.actualizarPerfil(datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificaciones.exito('Guardamos los cambios de tu perfil.');
        this.router.navigate(['/perfil']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }
}
