import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoMeGusta,
  Orden,
  PaginaPublicaciones,
  Publicacion,
} from '../models/publicacion.interface';

// Cuántas publicaciones trae cada "Ver más".
export const POR_PAGINA = 5;

// Servicio singleton con el estado del feed: signals privados y computed de
// solo lectura para los componentes (mismo patrón que en clase).
@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/publicaciones`;

  private publicacionesSignal = signal<Publicacion[]>([]);
  private totalSignal = signal(0);
  private paginasSignal = signal(0);
  private ordenSignal = signal<Orden>('fecha');

  publicaciones = computed(() => this.publicacionesSignal());
  orden = computed(() => this.ordenSignal());
  paginasCargadas = computed(() => this.paginasSignal());
  // Quedan más en el servidor si todavía no se cargaron todas.
  hayMas = computed(() => this.publicacionesSignal().length < this.totalSignal());

  cargando = signal(false);
  cargandoMas = signal(false);
  error = signal<string | null>(null);

  // Pedido en curso: si cambia el orden se cancela el anterior, así una
  // respuesta vieja no se mezcla con la lista nueva.
  private pedido?: Subscription;

  // Primera página con el orden elegido (reemplaza la lista).
  cargar(orden: Orden = this.ordenSignal()): void {
    this.pedido?.unsubscribe();
    this.ordenSignal.set(orden);
    this.cargando.set(true);
    this.cargandoMas.set(false);
    this.error.set(null);
    this.pedido = this.pedirPagina(0).subscribe({
      next: (pagina) => {
        this.publicacionesSignal.set(pagina.publicaciones);
        this.totalSignal.set(pagina.total);
        this.paginasSignal.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las publicaciones.');
        this.cargando.set(false);
      },
    });
  }

  // "Ver más": pide la página siguiente (offset = las que ya hay) y la agrega abajo.
  verMas(): Observable<PaginaPublicaciones> {
    this.cargandoMas.set(true);
    return this.pedirPagina(this.publicacionesSignal().length).pipe(
      tap({
        next: (pagina) => {
          // Si entre página y página cambió el orden por "me gusta", una
          // publicación podría repetirse: se agregan solo las nuevas.
          const ids = new Set(this.publicacionesSignal().map((p) => p.id));
          const nuevas = pagina.publicaciones.filter((p) => !ids.has(p.id));
          this.publicacionesSignal.update((lista) => [...lista, ...nuevas]);
          this.totalSignal.set(pagina.total);
          this.paginasSignal.update((n) => n + 1);
          this.cargandoMas.set(false);
        },
        error: () => this.cargandoMas.set(false),
      }),
    );
  }

  // FormData porque puede incluir la imagen (multipart/form-data).
  // Al volver al feed se muestra por fecha, así la nueva queda primera.
  crear(datos: FormData): Observable<Publicacion> {
    return this.http
      .post<Publicacion>(this.url, datos)
      .pipe(tap(() => this.ordenSignal.set('fecha')));
  }

  // Baja lógica en el servidor; acá se quita de la lista.
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => {
        this.publicacionesSignal.update((lista) => lista.filter((p) => p.id !== id));
        this.totalSignal.update((total) => Math.max(total - 1, 0));
      }),
    );
  }

  darMeGusta(id: string): Observable<EstadoMeGusta> {
    return this.http
      .post<EstadoMeGusta>(`${this.url}/${id}/like`, {})
      .pipe(tap((estado) => this.actualizarMeGusta(id, estado)));
  }

  quitarMeGusta(id: string): Observable<EstadoMeGusta> {
    return this.http
      .delete<EstadoMeGusta>(`${this.url}/${id}/like`)
      .pipe(tap((estado) => this.actualizarMeGusta(id, estado)));
  }

  // Para Mi perfil: las últimas publicaciones de un usuario con sus comentarios.
  // No toca el estado del feed.
  listarDeUsuario(usuarioId: string, limit: number, comentarios: number) {
    const params = new HttpParams()
      .set('usuario', usuarioId)
      .set('limit', limit)
      .set('comentarios', comentarios);
    return this.http.get<PaginaPublicaciones>(this.url, { params });
  }

  private pedirPagina(offset: number): Observable<PaginaPublicaciones> {
    const params = new HttpParams()
      .set('orden', this.ordenSignal())
      .set('offset', offset)
      .set('limit', POR_PAGINA);
    return this.http.get<PaginaPublicaciones>(this.url, { params });
  }

  // Actualiza el contador y el corazón con lo que respondió el servidor.
  private actualizarMeGusta(id: string, estado: EstadoMeGusta): void {
    this.publicacionesSignal.update((lista) =>
      lista.map((p) => (p.id === id ? { ...p, ...estado } : p)),
    );
  }
}
