import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // Passamos bufferLogs para o Nest esperar o Pino carregar antes de falar qualquer coisa
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Substitui o Logger padrão pelo Pino
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  const logger = app.get(Logger);
  logger.log(`🚀 Servidor iniciado com sucesso!`);
  logger.log(`👉 Teste a aplicação acessando: http://localhost:3000/`);
}
bootstrap().catch((err) => console.error(err));
