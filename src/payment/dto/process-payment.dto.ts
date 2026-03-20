import { IsUUID } from 'class-validator';

export class ProcessPaymentDto {
  @IsUUID()
  orderId: string;
}
