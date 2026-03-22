import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async processPayment(
    createPaymentDto: CreatePaymentDto,
    idempotencyKey: string,
  ) {
    try {
      const payment = await this.prisma.payment.create({
        data: {
          amount: createPaymentDto.amount,
          customerId: createPaymentDto.customerId,
          idempotencyKey,
          status: PaymentStatus.PENDING,
        },
      });

      return await this.executeMockPayment(payment.id);
    } catch (error) {
      // Verifica se é um erro conhecido do Prisma (ex: violação de unique)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return this.handleExistingPayment(idempotencyKey);
        }
      }

      console.error('Erro inesperado:', error);
      throw new InternalServerErrorException(
        'Erro interno ao processar pagamento',
      );
    }
  }

  private async handleExistingPayment(key: string) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
    });

    if (!existingPayment) {
      throw new InternalServerErrorException('Erro ao recuperar pagamento.');
    }

    if (existingPayment.status === PaymentStatus.PENDING) {
      throw new ConflictException({
        message: 'Uma requisição com esta chave já está em processamento.',
        status: PaymentStatus.PENDING,
      });
    }

    return { status: existingPayment.status };
  }

  private async executeMockPayment(paymentId: string) {
    const delay = Math.floor(Math.random() * 2000) + 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const isSuccess = Math.random() > 0.2;
    const finalStatus = isSuccess
      ? PaymentStatus.SUCCESS
      : PaymentStatus.FAILED;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: finalStatus },
    });

    return { status: finalStatus };
  }
}
