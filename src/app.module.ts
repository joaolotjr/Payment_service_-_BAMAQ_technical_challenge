import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    // Essa linha mágica faz o NestJS ler o arquivo .env assim que o app inicia!
    ConfigModule.forRoot({ isGlobal: true }),

    // Serve o nosso frontend na porta 3000
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),

    // 1. Conecta o NestJS ao Redis do Docker para a Fila
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),

    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }