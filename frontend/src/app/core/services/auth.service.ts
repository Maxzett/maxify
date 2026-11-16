import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion, TokenRefrescado, Usuario } from '../models/usuario.interface';

const CLAVE_TOKEN = 'maxify_token';
const CLAVE_USUARIO = 'maxify_usuario';

// Servicio singleton: guarda la sesión en localStorage y expone el usuario
// y el token como signals de solo lectura (mismo patrón que en clase).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/auth`;

  // signals privados: solo el servicio puede cambiar la sesión.
  private usuarioSignal = signal<Usuario | null>(this.leerUsuarioGuardado());
  private tokenSignal = signal<string | null>(localStorage.getItem(CLAVE_TOKEN));
  // true cuando el token ya se validó contra el servidor en esta carga de la
  // app (login, registro o /auth/autorizar en la pantalla Cargando).
  private validadaSignal = signal(false);

  // computed de solo lectura para los componentes.
  usuario = computed(() => this.usuarioSignal());
  tokenActual = computed(() => this.tokenSignal());
  validada = computed(() => this.validadaSignal());
  logueado = computed(() => this.usuarioSignal() !== null && this.tokenSignal() !== null);
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

  // Valida el token guardado (pantalla Cargando). Si es válido el servidor
  // devuelve los datos actualizados del usuario; si no, responde 401.
  autorizar(): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/autorizar`, {}).pipe(
      tap((usuario) => {
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
        this.usuarioSignal.set(usuario);
        this.validadaSignal.set(true);
      }),
    );
  }

  // Pide un token nuevo (otros 15 minutos) con el mismo payload.
  refrescar(): Observable<TokenRefrescado> {
    return this.http
      .post<TokenRefrescado>(`${this.url}/refrescar`, {})
      .pipe(tap(({ token }) => this.guardarToken(token)));
  }

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.usuarioSignal.set(null);
    this.tokenSignal.set(null);
    this.validadaSignal.set(false);
  }

  // El authInterceptor lo envía en el header Authorization.
  get token(): string | null {
    return this.tokenSignal();
  }

  private guardarSesion(sesion: Sesion): void {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    this.usuarioSignal.set(sesion.usuario);
    this.guardarToken(sesion.token);
    // El token lo acaba de emitir el servidor: no hace falta pasar por Cargando.
    this.validadaSignal.set(true);
  }

  private guardarToken(token: string): void {
    localStorage.setItem(CLAVE_TOKEN, token);
    this.tokenSignal.set(token);
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
