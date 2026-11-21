import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ComentariosPorDia,
  ComentariosPorPublicacion,
  PublicacionesPorUsuario,
  RangoFechas,
} from '../models/estadisticas.interface';

// Datos de los gráficos del dashboard (solo administradores).
@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/estadisticas`;

  publicacionesPorUsuario(rango: RangoFechas): Observable<PublicacionesPorUsuario[]> {
    return this.http.get<PublicacionesPorUsuario[]>(`${this.url}/publicaciones-por-usuario`, {
      params: { ...rango },
    });
  }

  comentariosPorDia(rango: RangoFechas): Observable<ComentariosPorDia> {
    return this.http.get<ComentariosPorDia>(`${this.url}/comentarios`, { params: { ...rango } });
  }

  comentariosPorPublicacion(rango: RangoFechas): Observable<ComentariosPorPublicacion[]> {
    return this.http.get<ComentariosPorPublicacion[]>(`${this.url}/comentarios-por-publicacion`, {
      params: { ...rango },
    });
  }
}
