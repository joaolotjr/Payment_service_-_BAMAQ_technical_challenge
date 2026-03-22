import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    // Essa linha mágica faz o NestJS ler o arquivo .env assim que o app inicia!
    ConfigModule.forRoot({ isGlobal: true }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }