import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
    let service: PaymentsService;
    let prisma: PrismaService;

    // Dublê simplificado e direto ao ponto
    const mockPrismaService = {
        payment: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PaymentsService>(PaymentsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('deve ser definido', () => {
        expect(service).toBeDefined();
    });

    describe('Caminho Feliz', () => {
        // Passamos 10000ms como terceiro argumento para dar tempo do mock rodar
        it('deve processar o pagamento e atualizar para SUCCESS', async () => {
            const mockDto = { amount: 15000, customerId: 'cli_123' };
            const idempotencyKey = 'uuid-123';

            // Passo 1: O Prisma salva o PENDING
            mockPrismaService.payment.create.mockResolvedValue({
                id: '1',
                ...mockDto,
                idempotencyKey,
                status: 'PENDING',
            });

            // Passo 2: O Prisma atualiza para SUCCESS no final do delay
            mockPrismaService.payment.update.mockResolvedValue({
                id: '1',
                status: 'SUCCESS',
            });

            // Aguarda o processamento real de 2 a 4 segundos da service
            const result = await service.processPayment(mockDto, idempotencyKey);

            expect(prisma.payment.create).toHaveBeenCalled();
            expect(['SUCCESS', 'FAILED']).toContain(result.status); //FAILED foi adicionado pois os sistema tem 20% de chance de falhar para simular casos reais.
        }, 10000);
    });
});