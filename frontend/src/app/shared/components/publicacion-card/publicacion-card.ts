import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Publicacion } from '../../../core/models/publicacion.interface';

// Cada publicación del feed es un componente que recibe los datos con input().
// Dar "me gusta", comentar y eliminar se conectan en los sprints 2 y 3.
@Component({
  selector: 'app-publicacion-card',
  imports: [DatePipe],
  templateUrl: './publicacion-card.html',
  styleUrl: './publicacion-card.scss',
})
export class PublicacionCard {
  publicacion = input.required<Publicacion>();

  iniciales = computed(() => {
    const autor = this.publicacion().autor;
    return autor ? (autor.nombre.charAt(0) + autor.apellido.charAt(0)).toUpperCase() : '?';
  });
}
