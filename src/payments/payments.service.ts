import { InjectQueue } from '@nestjs/bull';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('payments-queue') private paymentsQueue: Queue, // Injeta a fila do Redis
  ) {}

  async processPayment(dto: CreatePaymentDto, idempotencyKey: string) {
    try {
      this.logger.log(`Recebendo requisição com chave: ${idempotencyKey}`);

      // 1. Otimismo: Tenta inserir direto no banco como PENDING
      const payment = await this.prisma.payment.create({
        data: {
          amount: dto.amount,
          customerId: dto.customerId,
          idempotencyKey: idempotencyKey,
          status: 'PENDING',
        },
      });

      // 2. Dispara a tarefa assíncrona para o Redis processar no fundo!
      await this.paymentsQueue.add('process-transaction', {
        paymentId: payment.id,
        correlationId: idempotencyKey,
      });

      this.logger.log(`Pagamento enfileirado no Redis. Respondendo ao cliente imediatamente.`);

      // 3. Retorna PENDING instantaneamente para o usuário
      return payment;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(
          `Concorrência detectada para a chave: ${idempotencyKey}. Verificando estado atual...`,
        );

        const existingPayment = await this.prisma.payment.findUnique({
          where: { idempotencyKey },
        });

        if (existingPayment?.status === 'PENDING') {
          throw new ConflictException('Pagamento já está sendo processado.');
        }

        return existingPayment;
      }

      console.error('Erro inesperado:', error);
      throw new InternalServerErrorException('Erro interno ao processar pagamento');
    }
  }
}
