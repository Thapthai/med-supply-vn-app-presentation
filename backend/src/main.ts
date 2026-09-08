import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(`api/${process.env.APP_NAME}/v1`);
  app.useGlobalPipes(
    new ValidationPipe({
      /** ตัด property ที่ไม่มีใน DTO — ไม่ reject (หลีกเลี่ยง 400 เมื่อ client แนบฟิลด์เกิน เช่น payload มิกซ์กับระบบอื่น) */
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // CORS: ค่า origin = scheme + host (+ พอร์ตถ้าไม่ใช่ 80/443) เท่านั้น ห้ามใส่ path — คนละกับ URL ของหน้าเว็บ
  // หน้าเว็บที่ https://poseintelligence.co.th เรียก API ที่ https://www.poseintelligence.co.th = cross-origin ต้องอนุญาตทั้งสอง host
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [
      'http://localhost:3100',
      'http://127.0.0.1:3100',
      'http://localhost:4100',
      'http://127.0.0.1:4100',
      'http://10.11.9.84:3100',
      'http://10.11.9.84:4100',
      'https://phc.dyndns.biz',
      'https://poseintelligence.co.th',
      'https://www.poseintelligence.co.th',
      'http://172.20.220.112:7101',
      process.env.CORS_ORIGIN,
    ];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'client_id', 'client_secret'],
    credentials: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, "0.0.0.0");
}
bootstrap();
