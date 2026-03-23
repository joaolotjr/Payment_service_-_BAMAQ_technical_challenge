import { HttpService } from '@nestjs/axios';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull'; // 👈 MUDANÇA: Importamos como Namespace
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
    // 👈 REFERENCIAMOS COMO Bull.Job para o compilador não reclamar
    job: Bull.Job<{ paymentId: string; correlationId: string; webhookUrl?: string }>,
  ) {
    const { paymentId, correlationId, webhookUrl } = job.data;

    this.logger.log(
      `[Worker] Iniciando processamento do pagamento: ${paymentId} | CorrelationID: ${correlationId}`,
    );

    try {
      // Simula o tempo de rede do gateway de pagamento (2 a 4 segundos)
      const delay = Math.floor(Math.random() * 2000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Simula 80% de chance de sucesso e 20% de falha do cartão
      const finalStatus = Math.random() < 0.8 ? 'SUCCESS' : 'FAILED';

      // Atualiza o banco de dados com o status final
      const updatedPayment = await this.prisma.payment.update({
        where: { id: job.data.paymentId },
        data: { status: finalStatus },
      });

      this.logger.log(
        `[Worker] Pagamento ${job.data.paymentId} finalizado com status: ${finalStatus}`,
      );

      // 🌐 --- LÓGICA DO WEBHOOK --- 🌐
      if (job.data.webhookUrl) {
        this.logger.log(`[Worker] 🚀 Disparando Webhook para: ${job.data.webhookUrl}`);
        try {
          // Envia o payload final para o cliente
          await this.httpService.axiosRef.post(job.data.webhookUrl, {
            paymentId: updatedPayment.id,
            status: updatedPayment.status,
            amount: updatedPayment.amount,
            customerId: updatedPayment.customerId,
            correlationId: job.data.correlationId,
          });
          this.logger.log(`[Worker] ✅ Webhook entregue com sucesso!`);
        } catch (error) {
          // Em um cenário real, aqui entraria uma lógica de Retry do Webhook
          this.logger.error(`[Worker] ❌ Falha ao entregar Webhook: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `[Worker] Erro crítico ao processar pagamento ${job.data.paymentId}`,
        error.stack,
      );
    }
  }
}
