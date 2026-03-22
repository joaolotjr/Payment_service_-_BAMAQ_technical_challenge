import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    
    // Usamos "as any" para contornar o conflito de versões do @types/pg
    const adapter = new PrismaPg(pool as any);
    
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}