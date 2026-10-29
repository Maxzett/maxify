import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { passwordSegura } from '../../../core/validators/validadores';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  // Un solo campo para correo o nombre de usuario (ambos son únicos).
  form = this.fb.nonNullable.group({
    identificador: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8), passwordSegura]],
  });

  cargando = signal(false);
  // Error que devuelve el servidor (por ejemplo, credenciales incorrectas).
  errorServidor = signal<string | null>(null);

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.errorServidor.set(null);
    const { identificador, password } = this.form.getRawValue();

    this.auth.login(identificador.trim(), password).subscribe({
      next: (sesion) => {
        this.cargando.set(false);
        this.notificaciones.exito(`¡Hola, ${sesion.usuario.nombre}!`);
        this.router.navigate(['/publicaciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        if (error.status === 401) {
          this.errorServidor.set('Usuario o contraseña incorrectos.');
        } else if (error.status === 403) {
          this.avisarCuentaDeshabilitada();
        } else {
          this.notificaciones.error(this.notificaciones.mensajeDeError(error));
        }
      },
    });
  }

  private avisarCuentaDeshabilitada(): void {
    this.notificaciones
      .confirmar({
        titulo: 'Tu cuenta está deshabilitada',
        mensaje:
          'Un administrador deshabilitó tu cuenta, así que no podés ingresar. Si creés que es un error, contactá al equipo de la plataforma.',
        icono: 'bloqueo',
        textoConfirmar: 'Entendido',
      })
      .subscribe();
  }
}
