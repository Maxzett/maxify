import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AutorResumen, Comentario } from '../../../core/models/publicacion.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ComentariosService, MAX_COMENTARIO } from '../../../core/services/comentarios.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

const NO_VACIO = /\S/;

// Comentarios de una publicación: escribir, editar los propios y "Cargar más".
@Component({
  selector: 'app-comentarios',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './comentarios.html',
  styleUrl: './comentarios.scss',
})
export class Comentarios {
  private servicio = inject(ComentariosService);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private fb = inject(FormBuilder);

  publicacionId = input.required<string>();
  // Avisa a la página para actualizar el contador de la publicación.
  comentarioCreado = output<void>();

  readonly maxComentario = MAX_COMENTARIO;

  comentarios = signal<Comentario[]>([]);
  private total = signal(0);
  cargando = signal(true);
  cargandoMas = signal(false);
  error = signal<string | null>(null);

  // Quedan más en el servidor si todavía no se cargaron todos.
  hayMas = computed(() => this.comentarios().length < this.total());

  // Nuevo comentario.
  form = this.fb.nonNullable.group({
    mensaje: [
      '',
      [Validators.required, Validators.maxLength(MAX_COMENTARIO), Validators.pattern(NO_VACIO)],
    ],
  });
  enviando = signal(false);

  // Edición: un solo comentario a la vez.
  editandoId = signal<string | null>(null);
  edicion = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(MAX_COMENTARIO),
      Validators.pattern(NO_VACIO),
    ],
  });
  guardando = signal(false);

  constructor() {
    effect(() => this.cargar(this.publicacionId()));
  }

  // Carga inicial: los más recientes primero.
  cargar(publicacionId: string = this.publicacionId()): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar(publicacionId, 0).subscribe({
      next: (pagina) => {
        this.comentarios.set(pagina.comentarios);
        this.total.set(pagina.total);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los comentarios.');
        this.cargando.set(false);
      },
    });
  }

  // "Cargar más": agrega los siguientes abajo, sin borrar los que ya están.
  // offset = los que ya se muestran (incluidos los que escribió el usuario,
  // que también son los más recientes en el servidor).
  cargarMas(): void {
    this.cargandoMas.set(true);
    this.servicio.listar(this.publicacionId(), this.comentarios().length).subscribe({
      next: (pagina) => {
        const ids = new Set(this.comentarios().map((c) => c.id));
        const nuevos = pagina.comentarios.filter((c) => !ids.has(c.id));
        this.comentarios.update((lista) => [...lista, ...nuevos]);
        this.total.set(pagina.total);
        this.cargandoMas.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoMas.set(false);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  // Recibe la directiva del formulario para limpiarlo del todo (resetForm
  // también borra el "enviado" y así no queda el error en rojo).
  comentar(formulario: FormGroupDirective): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.servicio.crear(this.publicacionId(), this.form.getRawValue().mensaje.trim()).subscribe({
      next: (comentario) => {
        // Es el más reciente: va arriba de todo.
        this.comentarios.update((lista) => [comentario, ...lista]);
        this.total.update((total) => total + 1);
        formulario.resetForm();
        this.enviando.set(false);
        this.comentarioCreado.emit();
        this.notificaciones.exito('Comentario publicado.');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  esPropio(comentario: Comentario): boolean {
    return !!comentario.autor && comentario.autor.id === this.auth.usuario()?.id;
  }

  empezarEdicion(comentario: Comentario): void {
    this.edicion.reset(comentario.mensaje);
    this.editandoId.set(comentario.id);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(comentario: Comentario): void {
    if (this.edicion.invalid) {
      this.edicion.markAsTouched();
      return;
    }
    const mensaje = this.edicion.value.trim();
    // Sin cambios: no hace falta llamar al servidor ni marcarlo como editado.
    if (mensaje === comentario.mensaje) {
      this.cancelarEdicion();
      return;
    }
    this.guardando.set(true);
    this.servicio.editar(comentario.id, mensaje).subscribe({
      next: (editado) => {
        this.comentarios.update((lista) => lista.map((c) => (c.id === editado.id ? editado : c)));
        this.guardando.set(false);
        this.editandoId.set(null);
        this.notificaciones.exito('Comentario editado.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  iniciales(autor: AutorResumen | null): string {
    return autor ? (autor.nombre.charAt(0) + autor.apellido.charAt(0)).toUpperCase() : '?';
  }
}
