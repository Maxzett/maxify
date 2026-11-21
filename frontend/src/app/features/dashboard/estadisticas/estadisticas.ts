import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import {
  ComentariosPorDia,
  ComentariosPorPublicacion,
  PublicacionesPorUsuario,
  RangoFechas,
} from '../../../core/models/estadisticas.interface';
import { EstadisticasService } from '../../../core/services/estadisticas.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { TruncarPipe } from '../../../shared/pipes/truncar.pipe';

// Escala de tonos tierra del diseño "Cálido editorial".
const PALETA = [
  '#C2410C',
  '#E08A5A',
  '#8C6E54',
  '#3F7D4E',
  '#A8A29E',
  '#D9A441',
  '#6B4F3A',
  '#B4533C',
  '#7A8B6F',
  '#57534E',
];

interface Atajo {
  etiqueta: string;
  dias: number;
}

// Fecha local en formato AAAA-MM-DD (el de <input type="date"> y la API).
function aTexto(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function haceDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - (dias - 1));
  return aTexto(fecha);
}

// Dashboard / Estadísticas: tres gráficos de tipos distintos para el lapso
// elegido. Cada cambio de fechas vuelve a pedir los tres datos en paralelo.
@Component({
  selector: 'app-estadisticas',
  imports: [BaseChartDirective, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.scss',
})
export class Estadisticas {
  private servicio = inject(EstadisticasService);
  private notificaciones = inject(NotificacionesService);
  private truncar = new TruncarPipe();

  readonly hoy = aTexto(new Date());
  readonly atajos: Atajo[] = [
    { etiqueta: '7 días', dias: 7 },
    { etiqueta: '30 días', dias: 30 },
    { etiqueta: '90 días', dias: 90 },
    { etiqueta: '1 año', dias: 365 },
  ];

  desde = signal(haceDias(30));
  hasta = signal(this.hoy);
  rangoInvalido = computed(() => !this.desde() || !this.hasta() || this.desde() > this.hasta());

  cargando = signal(false);
  error = signal<string | null>(null);
  publicaciones = signal<PublicacionesPorUsuario[]>([]);
  comentarios = signal<ComentariosPorDia>({ total: 0, dias: [] });
  porPublicacion = signal<ComentariosPorPublicacion[]>([]);

  totalPublicaciones = computed(() => this.publicaciones().reduce((s, p) => s + p.cantidad, 0));
  promedioDiario = computed(() => {
    const { total, dias } = this.comentarios();
    return dias.length ? (total / dias.length).toFixed(1).replace('.', ',') : '0';
  });

  // Colores de texto y grilla tomados de las variables CSS (claro / oscuro).
  private estilos = getComputedStyle(document.documentElement);
  private colorTexto = this.estilos.getPropertyValue('--color-texto-2').trim() || '#57534e';
  private colorGrilla = this.estilos.getPropertyValue('--color-borde').trim() || '#ebe3d6';
  private colorFondo = this.estilos.getPropertyValue('--color-superficie').trim() || '#fffdf9';

  // Gráfico 1 (dona): publicaciones por usuario.
  graficoPublicaciones = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: this.publicaciones().map((p) => `@${p.username}`),
    datasets: [
      {
        data: this.publicaciones().map((p) => p.cantidad),
        backgroundColor: this.publicaciones().map((_, i) => PALETA[i % PALETA.length]),
        borderColor: this.colorFondo,
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  }));
  opcionesDona: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      // En el celular la leyenda va abajo para que la dona no quede chiquita.
      legend: {
        position: window.innerWidth < 600 ? 'bottom' : 'right',
        labels: { color: this.colorTexto, usePointStyle: true, boxWidth: 8 },
      },
      tooltip: {
        callbacks: {
          label: (c) => ` ${c.parsed} ${c.parsed === 1 ? 'publicación' : 'publicaciones'}`,
        },
      },
    },
  };

  // Gráfico 2 (línea): comentarios por día.
  graficoComentarios = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.comentarios().dias.map((d) => `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}`),
    datasets: [
      {
        data: this.comentarios().dias.map((d) => d.cantidad),
        label: 'Comentarios',
        borderColor: PALETA[0],
        backgroundColor: 'rgba(194, 65, 12, 0.12)',
        pointBackgroundColor: PALETA[0],
        pointRadius: this.comentarios().dias.length > 60 ? 0 : 3,
        fill: true,
        // monotone: suaviza la curva sin que baje de 0 entre dos puntos.
        cubicInterpolationMode: 'monotone',
      },
    ],
  }));
  opcionesLinea: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.colorTexto, maxTicksLimit: 10 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { color: this.colorTexto, precision: 0 },
        grid: { color: this.colorGrilla },
      },
    },
  };

  // Gráfico 3 (barras horizontales): comentarios por publicación.
  graficoPorPublicacion = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.porPublicacion().map((p) => this.truncar.transform(p.titulo, 32)),
    datasets: [
      {
        data: this.porPublicacion().map((p) => p.cantidad),
        label: 'Comentarios',
        backgroundColor: this.porPublicacion().map((_, i) => (i === 0 ? PALETA[0] : PALETA[1])),
        borderRadius: 6,
        maxBarThickness: 28,
      },
    ],
  }));
  opcionesBarras: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => this.porPublicacion()[items[0].dataIndex]?.titulo ?? '',
          afterTitle: (items) => `de @${this.porPublicacion()[items[0].dataIndex]?.autor ?? ''}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: this.colorTexto, precision: 0 },
        grid: { color: this.colorGrilla },
      },
      y: { ticks: { color: this.colorTexto }, grid: { display: false } },
    },
  };

  constructor() {
    // Cada vez que cambia el lapso (y es válido) se vuelven a pedir los datos.
    effect(() => {
      const rango: RangoFechas = { desde: this.desde(), hasta: this.hasta() };
      if (this.rangoInvalido()) return;
      untracked(() => this.cargar(rango));
    });
  }

  aplicarAtajo(atajo: Atajo): void {
    this.hasta.set(this.hoy);
    this.desde.set(haceDias(atajo.dias));
  }

  atajoActivo(atajo: Atajo): boolean {
    return this.hasta() === this.hoy && this.desde() === haceDias(atajo.dias);
  }

  cambiarDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
  }

  cambiarHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
  }

  cargar(rango: RangoFechas = { desde: this.desde(), hasta: this.hasta() }): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      publicaciones: this.servicio.publicacionesPorUsuario(rango),
      comentarios: this.servicio.comentariosPorDia(rango),
      porPublicacion: this.servicio.comentariosPorPublicacion(rango),
    }).subscribe({
      next: ({ publicaciones, comentarios, porPublicacion }) => {
        this.publicaciones.set(publicaciones);
        this.comentarios.set(comentarios);
        this.porPublicacion.set(porPublicacion);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.notificaciones.mensajeDeError(error));
      },
    });
  }
}
