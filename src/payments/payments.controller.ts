import { Controller, Post, Body, Headers, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    // O Express/Nest converte headers para minúsculo automaticamente
    @Headers('idempotency-key') idempotencyKey: string, 
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('O header Idempotency-Key é obrigatório');
    }

    return this.paymentsService.processPayment(createPaymentDto, idempotencyKey);
  }
}