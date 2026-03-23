// eslint-disable-next-line prettier/prettier
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUrl } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  // 👇 NOVAS VALIDAÇÕES: O campo é opcional, mas se vier, TEM que ser uma URL!
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;
}
