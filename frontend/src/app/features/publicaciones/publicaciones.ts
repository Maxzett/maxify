import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { PublicacionCard } from '../../shared/components/publicacion-card/publicacion-card';

type Orden = 'fecha' | 'likes';

@Component({
  selector: 'app-publicaciones',
  imports: [PublicacionCard, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class Publicaciones implements OnInit {
  servicio = inject(PublicacionesService);

  orden = signal<Orden>('fecha');

  // Por ahora se ordena lo que ya se cargó; en el Sprint 2 el orden
  // se pide al servidor junto con la paginación ("Ver más").
  ordenadas = computed(() => {
    const lista = [...this.servicio.publicaciones()];
    return this.orden() === 'likes'
      ? lista.sort((a, b) => b.likesCount - a.likesCount)
      : lista;
  });

  ngOnInit(): void {
    this.servicio.cargar();
  }
}
