import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { Publicacion } from '../../../core/models/publicacion.interface';

// Cada publicación del feed es un componente: recibe los datos con input()
// y avisa al padre con output() cuando el usuario toca "me gusta" o eliminar.
// El padre (la página) es quien llama a la API y abre el modal de confirmación.
@Component({
  selector: 'app-publicacion-card',
  imports: [DatePipe],
  templateUrl: './publicacion-card.html',
  styleUrl: './publicacion-card.scss',
})
export class PublicacionCard {
  publicacion = input.required<Publicacion>();
  // Muestra el botón de eliminar (solo en las publicaciones propias).
  puedeEliminar = input(false);
  // Deshabilita "me gusta" mientras se espera la respuesta del servidor.
  procesando = input(false);

  alternarMeGusta = output<void>();
  eliminar = output<void>();

  iniciales = computed(() => {
    const autor = this.publicacion().autor;
    return autor ? (autor.nombre.charAt(0) + autor.apellido.charAt(0)).toUpperCase() : '?';
  });
}
