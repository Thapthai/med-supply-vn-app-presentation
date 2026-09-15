import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Legacy MySQL เก็บ datetime ที่ไม่ได้ระบุเป็น '0000-00-00 00:00:00'
 * ไม่ใช่ NULL — Prisma DateTime? parse ค่านี้ไม่ได้ (Invalid time value)
 * แปลงเป็น null ตอนอ่าน ให้ตรง schema ที่ field เป็น optional
 */
function isMysqlZeroDate(value: unknown): boolean {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime());
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  return Number.isNaN(new Date(`${value}Z`).getTime());
}

function sanitizeZeroDates<T>(result: T): T {
  if (!Array.isArray(result)) {
    return result;
  }
  for (const row of result) {
    if (Array.isArray(row)) {
      for (let i = 0; i < row.length; i += 1) {
        if (isMysqlZeroDate(row[i])) {
          row[i] = null;
        }
      }
    } else if (row && typeof row === 'object') {
      const record = row as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        if (isMysqlZeroDate(record[key])) {
          record[key] = null;
        }
      }
    }
  }
  return result;
}

function wrapMariaDbQueryable<T extends { execute: Function; query: Function }>(
  client: T,
): T {
  const originalExecute = client.execute.bind(client);
  const originalQuery = client.query.bind(client);
  client.execute = ((...args: unknown[]) =>
    Promise.resolve(originalExecute(...args)).then(
      sanitizeZeroDates,
    )) as T['execute'];
  client.query = ((...args: unknown[]) =>
    Promise.resolve(originalQuery(...args)).then(
      sanitizeZeroDates,
    )) as T['query'];
  return client;
}

function createSafeMariaDbPool(config: mariadb.PoolConfig): mariadb.Pool {
  const pool = wrapMariaDbQueryable(mariadb.createPool(config));
  const originalGetConnection = pool.getConnection.bind(pool);
  pool.getConnection = (async () =>
    wrapMariaDbQueryable(
      await originalGetConnection(),
    )) as mariadb.Pool['getConnection'];
  return pool;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);


  constructor(private readonly config: ConfigService) {
    const pool = createSafeMariaDbPool({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: parseInt(
        process.env.DATABASE_CONNECTION_LIMIT || '20',
        10,
      ),
      allowPublicKeyRetrieval: true,
    });
    const adapter = new PrismaMariaDb(pool, { disposeExternalPool: true });

    const isProduction = process.env.NODE_ENV === 'production';

    super({
      adapter,
      log: isProduction
        ? [
          // In production: only log errors
          {
            emit: 'stdout',
            level: 'error',
          },
        ]
        : [
          // In development: log everything for debugging
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'stdout',
            level: 'error',
          },
        ],
      errorFormat: isProduction ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      const dbUrl = this.config.get<string>('DATABASE_URL');
      if (dbUrl) {
        // Mask password in log for security
        const maskedUrl = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
        this.logger.log(
          `✅ Database connection established successfully: ${maskedUrl}`,
        );
      } else {
        this.logger.log('✅ Database connection established successfully');
      }
    } catch (e) {
      this.logger.error('❌ Failed to connect to database', e);
      this.logger.error(
        `Database connection error: ${e instanceof Error ? e.message : String(e)}`,
      );
      // Re-throw to prevent app from starting with broken database connection
      throw e;
    }
  }

  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
      void this.$disconnect();
    });
  }
}
