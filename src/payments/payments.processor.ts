import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

@Processor('payments-queue')
export class PaymentsProcessor {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-transaction')
  async handleTransaction(job: Job<{ paymentId: string; correlationId: string }>) {
    this.logger.log(
      `[Worker] Iniciando processamento do pagamento: ${job.data.paymentId} | CorrelationID: ${job.data.correlationId}`,
    );

    // Simula o tempo de rede do gateway de pagamento (2 a 4 segundos)
    const delay = Math.floor(Math.random() * 2000) + 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simula 80% de chance de sucesso
    const finalStatus = Math.random() < 0.8 ? 'SUCCESS' : 'FAILED';

    await this.prisma.payment.update({
      where: { id: job.data.paymentId },
      data: { status: finalStatus },
    });

    this.logger.log(
      `[Worker] Pagamento ${job.data.paymentId} finalizado com status: ${finalStatus}`,
    );
  }
}
