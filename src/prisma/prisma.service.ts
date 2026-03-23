import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    // Configuração Sênior: Ajustando o Pool para lidar melhor com concorrência alta
    const pool = new Pool({
      connectionString,
      max: 20, // Aumenta o número máximo de clientes no pool
      idleTimeoutMillis: 30000, // Tempo que um cliente pode ficar ocioso
      connectionTimeoutMillis: 2000, // Tempo máximo para conectar
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const adapter = new PrismaPg(pool as any);

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
