import { getQueueToken } from '@nestjs/bull';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService (Assíncrono com Redis)', () => {
    let service: PaymentsService;
    let prisma: PrismaService;

    // Dublê do Banco de Dados
    const mockPrismaService = {
        payment: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
    };

    // Dublê da Fila do Redis (BullMQ)
    const mockQueue = {
        add: jest.fn(), // Finge que adicionou na fila
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    // Ensina o Jest a injetar a nossa fila falsa
                    provide: getQueueToken('payments-queue'),
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<PaymentsService>(PaymentsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Fluxo Assíncrono', () => {
        it('deve salvar como PENDING e enviar para a fila do Redis', async () => {
            const mockDto = { amount: 15000, customerId: 'cli_123' };
            const idempotencyKey = 'uuid-123';

            mockPrismaService.payment.create.mockResolvedValue({
                id: '1',
                ...mockDto,
                idempotencyKey,
                status: 'PENDING',
            });

            const result = await service.processPayment(mockDto, idempotencyKey);

            // Garante que salvou no banco
            expect(prisma.payment.create).toHaveBeenCalled();
            // Garante que jogou o trabalho pro Worker do Redis!
            expect(mockQueue.add).toHaveBeenCalledWith('process-transaction', { paymentId: '1' });
            // Garante que respondeu rápido pro cliente com PENDING
            expect(result.status).toBe('PENDING');
        });

        it('deve barrar requisições concorrentes (P2002) com status 409', async () => {
            const errorP2002 = new Error('Unique constraint failed');
            (errorP2002 as any).code = 'P2002';

            mockPrismaService.payment.create.mockRejectedValue(errorP2002);
            mockPrismaService.payment.findUnique.mockResolvedValue({ status: 'PENDING' });

            await expect(
                service.processPayment({ amount: 100, customerId: '123' }, 'key'),
            ).rejects.toThrow(ConflictException);
        });
    });
});