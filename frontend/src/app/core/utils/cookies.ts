// Cookies del navegador (document.cookie), sin librerías.
// El token se guarda en una cookie con fecha de vencimiento igual a la del
// JWT: el navegador la borra solo cuando vence, y en DevTools → Application →
// Cookies se ve cuánto le queda de vida.

export function leerCookie(nombre: string): string | null {
  const prefijo = `${nombre}=`;
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(prefijo));
  return cookie ? decodeURIComponent(cookie.slice(prefijo.length)) : null;
}

// vence: fecha exacta en la que el navegador la elimina.
export function guardarCookie(nombre: string, valor: string, vence: Date): void {
  // Secure solo en https (Vercel); en localhost el navegador la acepta igual.
  const segura = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${nombre}=${encodeURIComponent(valor)}; expires=${vence.toUTCString()}` +
    `; path=/; SameSite=Strict${segura}`;
}

// Una fecha de vencimiento en el pasado hace que el navegador la borre ya.
export function borrarCookie(nombre: string): void {
  document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}
