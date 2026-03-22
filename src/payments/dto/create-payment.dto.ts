import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1, { message: 'O valor (amount) deve ser maior que zero' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'O customerId é obrigatório' })
  customerId: string;
}
