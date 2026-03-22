import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

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

    return this.paymentsService.processPayment(
      createPaymentDto,
      idempotencyKey,
    );
  }
}
