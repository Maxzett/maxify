import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { errorDeImagen } from '../../core/validators/validadores';

// Mismos límites que valida el backend (CrearPublicacionDto).
export const MAX_TITULO = 100;
export const MAX_MENSAJE = 1000;
// Al menos un carácter que no sea espacio.
const NO_VACIO = /\S/;

@Component({
  selector: 'app-crear-publicacion',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './crear-publicacion.html',
  styleUrl: './crear-publicacion.scss',
})
export class CrearPublicacion {
  private fb = inject(FormBuilder);
  private servicio = inject(PublicacionesService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  readonly maxTitulo = MAX_TITULO;
  readonly maxMensaje = MAX_MENSAJE;

  form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(MAX_TITULO), Validators.pattern(NO_VACIO)]],
    mensaje: ['', [Validators.required, Validators.maxLength(MAX_MENSAJE), Validators.pattern(NO_VACIO)]],
  });

  // La imagen (opcional) no forma parte del FormGroup: es un File del FormData.
  imagen = signal<File | null>(null);
  vistaPrevia = signal<string | null>(null);
  errorImagen = signal<string | null>(null);
  arrastrando = signal(false);
  cargando = signal(false);

  constructor() {
    // Libera la URL temporal de la vista previa al salir de la pantalla.
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  elegirImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (archivo) this.usarImagen(archivo);
  }

  // Arrastrar y soltar sobre el recuadro de la imagen.
  sobreZona(evento: DragEvent): void {
    evento.preventDefault(); // sin esto el navegador abre el archivo
    this.arrastrando.set(true);
  }

  soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const archivo = evento.dataTransfer?.files[0];
    if (archivo) this.usarImagen(archivo);
  }

  quitarImagen(): void {
    this.liberarVistaPrevia();
    this.imagen.set(null);
    this.errorImagen.set(null);
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);

    // multipart/form-data: título, mensaje y el archivo "imagen".
    const { titulo, mensaje } = this.form.getRawValue();
    const datos = new FormData();
    datos.append('titulo', titulo.trim());
    datos.append('mensaje', mensaje.trim());
    const imagen = this.imagen();
    if (imagen) datos.append('imagen', imagen);

    this.servicio.crear(datos).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificaciones.exito('Publicación creada.');
        this.router.navigate(['/publicaciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  private usarImagen(archivo: File): void {
    const error = errorDeImagen(archivo);
    this.errorImagen.set(error);
    if (error) return;
    this.liberarVistaPrevia();
    this.imagen.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
