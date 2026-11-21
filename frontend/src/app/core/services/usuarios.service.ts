import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.interface';
import { AuthService } from './auth.service';

// Perfil propio y administración de usuarios (/usuarios en la API).
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = `${environment.apiUrl}/usuarios`;

  // multipart (puede incluir la foto nueva). Actualiza la sesión con los datos
  // que devuelve el servidor: header y Mi perfil cambian al instante.
  actualizarPerfil(datos: FormData): Observable<Usuario> {
    return this.http
      .patch<Usuario>(`${this.url}/me`, datos)
      .pipe(tap((usuario) => this.auth.actualizarUsuario(usuario)));
  }

  // Solo administradores (el servidor responde 403 a un usuario común).
  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  crear(datos: FormData): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, datos);
  }

  deshabilitar(id: string): Observable<Usuario> {
    return this.http.delete<Usuario>(`${this.url}/${id}`);
  }

  habilitar(id: string): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/${id}/habilitar`, {});
  }
}
