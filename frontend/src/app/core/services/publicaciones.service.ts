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

// Cuántas publicaciones se muestran por página.
export const POR_PAGINA = 5;

// Servicio singleton con el estado del feed: signals privados y computed de
// solo lectura para los componentes (mismo patrón que en clase).
@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/publicaciones`;

  private publicacionesSignal = signal<Publicacion[]>([]);
  private totalSignal = signal(0);
  private paginaSignal = signal(1);
  private ordenSignal = signal<Orden>('fecha');

  publicaciones = computed(() => this.publicacionesSignal());
  orden = computed(() => this.ordenSignal());
  pagina = computed(() => this.paginaSignal());
  total = computed(() => this.totalSignal());
  // Siempre hay al menos una página (aunque esté vacía).
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalSignal() / POR_PAGINA)));
  // Rango que se está mostrando, para el texto "Mostrando 6–10 de 12".
  desde = computed(() => (this.totalSignal() ? (this.paginaSignal() - 1) * POR_PAGINA + 1 : 0));
  hasta = computed(() => this.desde() + this.publicacionesSignal().length - 1);

  cargando = signal(false);
  error = signal<string | null>(null);

  // Pedido en curso: si se cambia de página u orden antes de que responda,
  // se cancela, así una respuesta vieja no pisa a la nueva.
  private pedido?: Subscription;

  // Carga una página (1 = la primera) con el orden elegido. El servidor
  // ordena y recorta: offset = (página - 1) × POR_PAGINA.
  cargar(pagina: number = this.paginaSignal(), orden: Orden = this.ordenSignal()): void {
    this.pedido?.unsubscribe();
    this.paginaSignal.set(pagina);
    this.ordenSignal.set(orden);
    this.cargando.set(true);
    this.error.set(null);
    this.pedido = this.pedirPagina((pagina - 1) * POR_PAGINA).subscribe({
      next: (respuesta) => {
        this.publicacionesSignal.set(respuesta.publicaciones);
        this.totalSignal.set(respuesta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las publicaciones.');
        this.cargando.set(false);
      },
    });
  }

  // Detalle de una publicación (página Publicación). No toca el estado del feed.
  obtener(id: string): Observable<Publicacion> {
    return this.http.get<Publicacion>(`${this.url}/${id}`);
  }

  // FormData porque puede incluir la imagen (multipart/form-data).
  // Después se vuelve a /publicaciones (página 1, más recientes): la nueva queda primera.
  crear(datos: FormData): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.url, datos);
  }

  // Baja lógica en el servidor. Se quita de la lista al instante y después
  // la página se vuelve a pedir, así la primera de la página siguiente sube
  // a ocupar su lugar.
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
