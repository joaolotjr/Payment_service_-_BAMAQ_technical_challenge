import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // <-- Import do Prisma
import { PaymentsController } from './payments.controller';
import { PaymentsProcessor } from './payments.processor';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    // Registra a fila específica para injetar no Service
    BullModule.registerQueue({
      name: 'payments-queue',
    }),
  ],
  controllers: [PaymentsController],
  // Declaramos o PrismaService aqui para que o Nest saiba injetá-lo!
  providers: [PaymentsService, PaymentsProcessor, PrismaService],
})
export class PaymentsModule {}
