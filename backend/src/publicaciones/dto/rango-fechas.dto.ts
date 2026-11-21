import { IsDateString } from 'class-validator';

// GET /estadisticas/...?desde=2026-11-01&hasta=2026-11-20
// Fechas AAAA-MM-DD (las del <input type="date"> / datepicker). Ambas
// incluidas: "hasta" cuenta todo ese día.
export class RangoFechasDto {
  @IsDateString({ strict: true }, { message: 'La fecha "desde" no es válida' })
  desde!: string;

  @IsDateString({ strict: true }, { message: 'La fecha "hasta" no es válida' })
  hasta!: string;
}
