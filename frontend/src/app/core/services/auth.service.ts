import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion, Usuario } from '../models/usuario.interface';

const CLAVE_TOKEN = 'maxify_token';
const CLAVE_USUARIO = 'maxify_usuario';

// Servicio singleton: guarda la sesión en localStorage y expone el usuario
// actual como signal de solo lectura (mismo patrón que en clase).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/auth`;

  // signal privado: solo el servicio puede cambiar el usuario.
  private usuarioSignal = signal<Usuario | null>(this.leerUsuarioGuardado());

  // computed de solo lectura para los componentes.
  usuario = computed(() => this.usuarioSignal());
  logueado = computed(() => this.usuarioSignal() !== null);
  esAdmin = computed(() => this.usuarioSignal()?.perfil === 'administrador');
  iniciales = computed(() => {
    const usuario = this.usuarioSignal();
    if (!usuario) return '';
    return (usuario.nombre.charAt(0) + usuario.apellido.charAt(0)).toUpperCase();
  });

  // FormData porque el registro incluye la foto (multipart/form-data).
  registrar(datos: FormData): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${this.url}/registro`, datos)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  // identificador = correo o nombre de usuario.
  login(identificador: string, password: string): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${this.url}/login`, { identificador, password })
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.usuarioSignal.set(null);
  }

  // El authInterceptor lo envía en el header Authorization.
  get token(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  private guardarSesion(sesion: Sesion): void {
    localStorage.setItem(CLAVE_TOKEN, sesion.token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    this.usuarioSignal.set(sesion.usuario);
  }

  private leerUsuarioGuardado(): Usuario | null {
    try {
      const guardado = localStorage.getItem(CLAVE_USUARIO);
      return guardado ? (JSON.parse(guardado) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
