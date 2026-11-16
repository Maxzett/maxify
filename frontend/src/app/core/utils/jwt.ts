// Lee el vencimiento (claim "exp") de un JWT, en milisegundos.
// El payload es la parte del medio del token, en base64url: no está cifrado,
// solo firmado, así que el front lo puede leer (la firma la valida el back).
export function vencimientoDelToken(token: string): number | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
