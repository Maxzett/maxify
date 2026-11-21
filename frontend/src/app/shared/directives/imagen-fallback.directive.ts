import { Directive, ElementRef, HostListener, Renderer2, inject, input } from '@angular/core';

// Avatar genérico (SVG en /public) para fotos de perfil que no cargan.
const AVATAR_POR_DEFECTO = 'avatar.svg';

// Directiva de atributo para <img> (mismo estilo que appHighlight de clase,
// con @HostListener + Renderer2). Si la imagen no carga (URL rota, Cloudinary
// caído, sin conexión):
//   <img appImagenFallback ...>                → muestra el avatar genérico
//   <img appImagenFallback="ocultar" ...>      → oculta la imagen
//   <img appImagenFallback="otra.png" ...>     → usa esa imagen de reemplazo
@Directive({ selector: 'img[appImagenFallback]' })
export class ImagenFallback {
  private elemento = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private renderer = inject(Renderer2);

  reemplazo = input('', { alias: 'appImagenFallback' });
  private aplicado = false;

  @HostListener('error')
  alFallar(): void {
    // Una sola vez: si el reemplazo también falla, no entra en bucle.
    if (this.aplicado) return;
    this.aplicado = true;
    const img = this.elemento.nativeElement;
    if (this.reemplazo() === 'ocultar') {
      this.renderer.setStyle(img, 'display', 'none');
      return;
    }
    this.renderer.setAttribute(img, 'src', this.reemplazo() || AVATAR_POR_DEFECTO);
    this.renderer.addClass(img, 'imagen-reemplazada');
  }
}
