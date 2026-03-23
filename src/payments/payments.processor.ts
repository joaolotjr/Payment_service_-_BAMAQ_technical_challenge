import { HttpService } from '@nestjs/axios';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { PrismaService } from '../prisma/prisma.service';

@Processor('payments-queue')
export class PaymentsProcessor {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  @Process('process-transaction')
  async handleTransaction(
    job: Bull.Job<{ paymentId: string; correlationId: string; webhookUrl?: string }>,
  ) {
    const { paymentId, correlationId, webhookUrl } = job.data;

    this.logger.log(
      `[Worker] Iniciando processamento: ${paymentId} | CorrelationID: ${correlationId}`,
    );

    try {
      // Simula delay de rede (2 a 4s)
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 2000) + 2000));

      const finalStatus = Math.random() < 0.8 ? 'SUCCESS' : 'FAILED';

      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: finalStatus },
      });

      this.logger.log(`[Worker] Pagamento ${paymentId} finalizado: ${finalStatus}`);

      // 🌐 ENVIO DO WEBHOOK
      if (webhookUrl) {
        this.logger.log(`[Worker] 🚀 Disparando Webhook para: ${webhookUrl}`);
        try {
          await this.httpService.axiosRef.post(webhookUrl, {
            paymentId: updatedPayment.id,
            status: updatedPayment.status,
            amount: updatedPayment.amount,
            customerId: updatedPayment.customerId,
            correlationId: correlationId,
          });
          this.logger.log(`[Worker] ✅ Webhook entregue com sucesso!`);
        } catch (error) {
          // 👈 FIX: Tratando erro de rede com segurança (sem access on any)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`[Worker] ❌ Falha ao entregar Webhook: ${errorMessage}`);
        }
      }
    } catch (error) {
      // 👈 FIX: Tratando erro crítico com segurança
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      this.logger.error(`[Worker] Erro crítico no pagamento ${paymentId}`, errorStack);
    }
  }
}
