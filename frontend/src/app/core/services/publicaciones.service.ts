import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../models/publicacion.interface';

@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/publicaciones`;

  private publicacionesSignal = signal<Publicacion[]>([]);
  publicaciones = computed(() => this.publicacionesSignal());
  cargando = signal(false);
  error = signal<string | null>(null);

  // Versión inicial: trae las últimas publicaciones.
  // El orden en el servidor y el botón "Ver más" llegan en el Sprint 2.
  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.http.get<Publicacion[]>(this.url).subscribe({
      next: (publicaciones) => {
        this.publicacionesSignal.set(publicaciones);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las publicaciones.');
        this.cargando.set(false);
      },
    });
  }
}
