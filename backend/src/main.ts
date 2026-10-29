import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Valida todos los DTOs: datos inválidos o campos de más → 400 automático.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      // Un solo mensaje por campo (el primero que falla).
      stopAtFirstError: true,
    }),
  );
  // Solo el frontend puede llamar a la API. Se admiten varios orígenes
  // separados por coma (por ejemplo, el de Vercel y el local).
  const origenes = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((origen) => origen.trim());
  app.enableCors({ origin: origenes });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
