import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { randomUUID } from 'crypto';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    BullModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
    }),

    // --- NOVO: Motor de Observabilidade ---
    LoggerModule.forRoot({
      pinoHttp: {
        // Gera um Correlation ID único se o cliente não mandar um
        genReqId: (req) => req.headers['x-correlation-id'] || randomUUID(),
        // Embeleza o terminal local (em produção seria JSON puro)
        transport: {
          target: 'pino-pretty',
          options: { singleLine: true },
        },
      },
    }),

    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }