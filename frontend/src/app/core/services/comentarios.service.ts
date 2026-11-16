import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comentario, PaginaComentarios } from '../models/publicacion.interface';

// Cuántos comentarios trae la carga inicial y cada "Cargar más".
export const COMENTARIOS_POR_PAGINA = 5;
export const MAX_COMENTARIO = 500;

// Pedidos a la API de comentarios. El estado (la lista que se ve) lo maneja
// el componente de la página Publicación, porque es propio de cada publicación.
@Injectable({ providedIn: 'root' })
export class ComentariosService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  // Del más reciente al más viejo; offset = los que ya se muestran.
  listar(publicacionId: string, offset: number): Observable<PaginaComentarios> {
    const params = new HttpParams().set('offset', offset).set('limit', COMENTARIOS_POR_PAGINA);
    return this.http.get<PaginaComentarios>(
      `${this.url}/publicaciones/${publicacionId}/comentarios`,
      { params },
    );
  }

  crear(publicacionId: string, mensaje: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.url}/publicaciones/${publicacionId}/comentarios`, {
      mensaje,
    });
  }

  // Solo el autor; el servidor lo marca como modificado ("(editado)").
  editar(id: string, mensaje: string): Observable<Comentario> {
    return this.http.put<Comentario>(`${this.url}/comentarios/${id}`, { mensaje });
  }
}
