import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma/prisma.service'; // <-- Importe aqui

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService], // <-- Adicione aqui
})
export class PaymentsModule {}
