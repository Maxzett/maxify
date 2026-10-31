import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import {
  RepetirPasswordMatcher,
  edadMinima,
  errorDeImagen,
  passwordSegura,
  passwordsIguales,
} from '../../../core/validators/validadores';

export const MAX_DESCRIPCION = 200;

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  readonly maxDescripcion = MAX_DESCRIPCION;
  readonly repetirMatcher = new RepetirPasswordMatcher();
  readonly hoy = new Date().toISOString().slice(0, 10);

  form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._]{3,20}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), passwordSegura]],
      repetirPassword: ['', Validators.required],
      fechaNacimiento: ['', [Validators.required, edadMinima(13)]],
      descripcion: ['', Validators.maxLength(MAX_DESCRIPCION)],
    },
    { validators: passwordsIguales },
  );

  // La foto no forma parte del FormGroup: es un File que se agrega al FormData.
  foto = signal<File | null>(null);
  vistaPrevia = signal<string | null>(null);
  errorFoto = signal<string | null>(null);
  cargando = signal(false);

  constructor() {
    // Libera la URL temporal de la vista previa al salir de la pantalla.
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  elegirFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    const error = errorDeImagen(archivo);
    this.errorFoto.set(error);
    if (error) return;
    this.liberarVistaPrevia();
    this.foto.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  quitarFoto(): void {
    this.liberarVistaPrevia();
    this.foto.set(null);
  }

  crearCuenta(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificaciones.error('Revisá los campos marcados en rojo.');
      return;
    }
    this.cargando.set(true);

    // multipart/form-data: los campos de texto + el archivo "foto".
    const datos = new FormData();
    for (const [campo, valor] of Object.entries(this.form.getRawValue())) {
      datos.append(campo, valor.trim());
    }
    const foto = this.foto();
    if (foto) datos.append('foto', foto);

    this.auth.registrar(datos).subscribe({
      next: (sesion) => {
        this.cargando.set(false);
        this.notificaciones.exito(`¡Bienvenido/a a Maxify, ${sesion.usuario.nombre}!`);
        this.router.navigate(['/publicaciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        const mensaje = this.notificaciones.mensajeDeError(error);
        // 409: el servidor indica qué campo está repetido y lo marcamos.
        const campo = error.error?.campo as 'correo' | 'username' | undefined;
        if (error.status === 409 && campo) {
          const control = this.form.controls[campo];
          control.setErrors({ enUso: mensaje });
          control.markAsTouched();
        }
        this.notificaciones.error(mensaje);
      },
    });
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
