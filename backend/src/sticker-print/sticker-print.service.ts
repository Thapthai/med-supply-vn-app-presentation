import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import type { PrintLabelItemDto } from './dto/print-label-item.dto';
import type { PrintLabelItemsDto } from './dto/print-label-items.dto';
import type { PrintSatoSbplDto } from './dto/print-sato-sbpl.dto';

@Injectable()
export class StickerPrintService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private satoTemplateCache: string | null = null;

  /**
   * ส่ง SBPL สตริง: connect → write → end (พฤติกรรมเดียวกับที่เครื่องรับได้)
   */
  private async sendSbplLikePrintLabel(
    host: string,
    port: number,
    sbplCommand: string,
  ): Promise<{ bytesSent: number }> {
    const h = host.trim();
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      throw new BadRequestException('พอร์ตไม่ถูกต้อง');
    }
    const bytesSent = Buffer.byteLength(sbplCommand, 'utf8');

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.once('error', (err) => {
        const msg = err.message;
        if (msg.includes('ECONNREFUSED')) {
          reject(
            new ServiceUnavailableException(
              'ปฏิเสธการเชื่อมต่อ (ECONNREFUSED) — ตรวจ IP/พอร์ต RAW TCP',
            ),
          );
        } else {
          reject(new ServiceUnavailableException(msg));
        }
      });
      client.connect(port, h, () => {
        client.write(sbplCommand);
        client.end();
        resolve({ bytesSent });
      });
    });
  }

  private buildSatoSbplPayload(dto: PrintSatoSbplDto): string {
    const template = this.getSatoSbplTemplate();
    const withTokens = this.applySatoTokens(template, dto);
    return this.stripRfidSbplCommands(withTokens);
  }

  /** ฉลากไม่มี RFID — ตัดคำสั่ง SBPL แบบ ESC RU,… ESC IP…; ออก */
  private stripRfidSbplCommands(payload: string): string {
    return payload.replace(/\u001bRU,\d+\u001bIP[^\r\n;]*;/g, '');
  }

  private applySatoTokens(template: string, dto: PrintSatoSbplDto): string {
    const replacements: Array<[string, string | undefined]> = [
      ['QrCode1', dto.QrCode1],
      ['Qrcode', dto.Qrcode],
      ['QrCode2', dto.QrCode2],
      ['itemcode2', dto.itemcode2],
      ['num2', dto.num2],
      ['num3', dto.num3],
      ['num4', dto.num4],
    ];

    return replacements.reduce((acc, [token, value]) => {
      if (value == null) return acc;
      return acc.split(token).join(value);
    }, template);
  }

  private getSatoSbplTemplate(): string {
    if (this.satoTemplateCache != null) {
      return this.satoTemplateCache;
    }

    // JS อยู่ dist/src/sticker-print/ แต่ nest assets ไป dist/sticker-print/example/
    const candidates = [
      path.join(__dirname, '..', '..', 'sticker-print', 'example', 'SBPL1.txt'),
      path.join(process.cwd(), 'dist', 'sticker-print', 'example', 'SBPL1.txt'),
      path.join(process.cwd(), 'dist', 'src', 'sticker-print', 'example', 'SBPL1.txt'),
      path.join(process.cwd(), 'src', 'sticker-print', 'example', 'SBPL1.txt'),
    ];

    for (const p of candidates) {
      if (!existsSync(p)) continue;
      const txt = readFileSync(p, 'utf8');
      this.satoTemplateCache = txt;
      return txt;
    }

    throw new ServiceUnavailableException(
      'ไม่พบไฟล์เทมเพลต SATO SBPL1.txt (src/sticker-print/example/SBPL1.txt)',
    );
  }

  /** host: อาร์กิวเมนต์ (ถ้ามี) หรือ PRINT_STICKER_HOST ใน .env */
  private resolvePrintHost(ip: string | undefined): string {
    if (typeof ip === 'string' && ip.trim() !== '') {
      return this.normalizeTcpHost(ip);
    }
    const env = this.config.get<string>('PRINT_STICKER_HOST');
    if (typeof env === 'string' && env.trim() !== '') {
      return this.normalizeTcpHost(env);
    }
    throw new BadRequestException('ตั้ง PRINT_STICKER_HOST ใน .env ของ backend');
  }

  private resolvePrintPort(port: unknown): number {
    if (port != null && port !== '') {
      const n = Number(port);
      if (Number.isFinite(n) && n >= 1 && n <= 65535) return n;
    }
    const raw = this.config.get<string>('PRINT_STICKER_PORT');
    if (raw != null && String(raw).trim() !== '') {
      const n = Number(String(raw).trim());
      if (Number.isFinite(n) && n >= 1 && n <= 65535) return n;
    }
    return 9100;
  }

  private normalizeTcpHost(raw: string): string {
    const t = raw.trim();
    if (/^https?:\/\//i.test(t)) {
      try {
        const { hostname } = new URL(t);
        return (hostname || t).trim();
      } catch {
        return t.replace(/^https?:\/\//i, '').split('/')[0]?.trim() ?? t;
      }
    }
    return t;
  }

  /** ทดพิมพ์: SBPL จาก SBPL1.txt + token demo → TCP */
  public async printLabel(
    ip?: string,
    port?: unknown,
  ): Promise<{
    success: true;
    bytesSent: number;
    host: string;
    port: number;
    template: 'SBPL1.txt';
  }> {
    const host = this.resolvePrintHost(ip);
    const resolvedPort = this.resolvePrintPort(port);
    const payload = this.buildSatoSbplPayload({
      host,
      port: resolvedPort,
      QrCode1: 'QrCode1',
      Qrcode: 'Qrcode',
      QrCode2: 'QrCode2',
      itemcode2: 'itemcode2',
      num2: 'num2',
      num3: 'num3',
      num4: 'num4',
    } as PrintSatoSbplDto);
    const { bytesSent } = await this.sendSbplLikePrintLabel(host, resolvedPort, payload);
    return { success: true, bytesSent, host, port: resolvedPort, template: 'SBPL1.txt' };
  }

  /** พิมพ์ฉลากจาก Item master — SBPL1 + token จากฟิลด์ item (override จาก body ได้) */
  async printLabelItem(dto: PrintLabelItemDto): Promise<{
    success: true;
    bytesSent: number;
    host: string;
    port: number;
    template: 'SBPL1.txt';
    itemcode: string;
  }> {
    const code = dto.itemcode.trim();
    const item = await this.prisma.item.findUnique({ where: { itemcode: code } });
    if (!item) {
      throw new NotFoundException(`ไม่พบ Item รหัส ${code}`);
    }
    const host = this.resolvePrintHost(undefined);
    const resolvedPort = this.resolvePrintPort(undefined);
    const tokens = this.mergeItemStickerTokens(item, dto);
    const payload = this.buildSatoSbplPayload({
      host,
      port: resolvedPort,
      ...tokens,
    } as PrintSatoSbplDto);
    const { bytesSent } = await this.sendSbplLikePrintLabel(host, resolvedPort, payload);
    return {
      success: true,
      bytesSent,
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      itemcode: item.itemcode,
    };
  }

  /** พิมพ์หลายฉลากตามลำดับแถว — แต่ละแถวมีจำนวนฉลากเอง */
  async printLabelItems(dto: PrintLabelItemsDto): Promise<{
    success: true;
    message: string;
    printedAt: string;
    lineCount: number;
    host: string;
    port: number;
    template: 'SBPL1.txt';
    count: number;
    totalBytesSent: number;
    items: { itemcode: string; copies: number; bytesSent: number }[];
  }> {
    const host = this.resolvePrintHost(undefined);
    const resolvedPort = this.resolvePrintPort(undefined);

    const entries = dto.items
      .map((l) => ({
        code: l.itemcode.trim(),
        copies:
          l.copies != null && Number.isFinite(l.copies)
            ? Math.min(50, Math.max(1, Math.floor(l.copies)))
            : 1,
        expire_date:
          l.expire_date != null && String(l.expire_date).trim() !== ''
            ? String(l.expire_date).trim().slice(0, 10)
            : undefined,
      }))
      .filter((l) => l.code.length > 0);

    if (entries.length === 0) {
      throw new BadRequestException('เลือกอย่างน้อย 1 รายการ');
    }

    const uniqueCodes = [...new Set(entries.map((l) => l.code))];
    const rows = await this.prisma.item.findMany({
      where: { itemcode: { in: uniqueCodes } },
    });
    const byCode = new Map(rows.map((r) => [r.itemcode, r]));
    const missing = uniqueCodes.filter((c) => !byCode.has(c));
    if (missing.length > 0) {
      const sample = missing.slice(0, 12).join(', ');
      throw new NotFoundException(
        `ไม่พบ Item ${missing.length} รายการ (เช่น ${sample}${missing.length > 12 ? '…' : ''})`,
      );
    }

    const totalLabels = entries.reduce((s, l) => s + l.copies, 0);
    if (totalLabels > 2000) {
      throw new BadRequestException(
        `จำนวนฉลากรวมเกิน 2000 (ตอนนี้รวม ${totalLabels} แผ่น)`,
      );
    }

    const items: { itemcode: string; copies: number; bytesSent: number }[] = [];
    let totalBytesSent = 0;
    for (const entry of entries) {
      const row = byCode.get(entry.code)!;
      const labelDto: PrintLabelItemDto = { itemcode: row.itemcode };
      if (entry.expire_date) {
        labelDto.num4 = entry.expire_date;
      }
      const tokens = this.mergeItemStickerTokens(row, labelDto);
      const payload = this.buildSatoSbplPayload({
        host,
        port: resolvedPort,
        ...tokens,
      } as PrintSatoSbplDto);
      let itemBytes = 0;
      for (let c = 0; c < entry.copies; c++) {
        const { bytesSent } = await this.sendSbplLikePrintLabel(host, resolvedPort, payload);
        itemBytes += bytesSent;
      }
      items.push({ itemcode: row.itemcode, copies: entry.copies, bytesSent: itemBytes });
      totalBytesSent += itemBytes;
    }

    return {
      success: true,
      message: 'ส่งคำสั่งพิมพ์ไปเครื่องปริ้นแล้ว',
      printedAt: new Date().toISOString(),
      lineCount: entries.length,
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      count: totalLabels,
      totalBytesSent,
      items,
    };
  }

  private mergeItemStickerTokens(
    item: NonNullable<Awaited<ReturnType<PrismaService['item']['findUnique']>>>,
    dto: PrintLabelItemDto,
  ): Pick<PrintSatoSbplDto, 'QrCode1' | 'Qrcode' | 'QrCode2' | 'itemcode2' | 'num2' | 'num3' | 'num4'> {
    const trunc = (s: string, max: number) => {
      const t = s.replace(/\r?\n/g, ' ').trim();
      return t.length > max ? t.slice(0, max) : t;
    };
    const itemname = item.itemname?.trim() || item.itemcode;
    const mainQr = item.Barcode?.trim() || item.itemcode;
    const sec = item.itemcode2?.trim() || item.InternalCode?.trim() || '';
    const codeLine = item.itemcode2?.trim() || item.itemcode;
    const serialLine = item.RefNo?.trim() || item.Barcode?.trim() || '-';
    const lotLine = item.ManufacturerName?.trim() || item.SuplierName?.trim() || '-';
    const expLine =
      item.ModiflyDate != null
        ? item.ModiflyDate.toISOString().slice(0, 10)
        : item.ShelfLife != null && item.ShelfLife > 0
          ? String(item.ShelfLife)
          : '-';
    return {
      QrCode1:
        dto.QrCode1 != null && String(dto.QrCode1).trim() !== ''
          ? trunc(String(dto.QrCode1), 200)
          : trunc(itemname, 200),
      Qrcode:
        dto.Qrcode != null && String(dto.Qrcode).trim() !== ''
          ? trunc(String(dto.Qrcode), 500)
          : trunc(mainQr, 500),
      QrCode2:
        dto.QrCode2 != null && String(dto.QrCode2).trim() !== ''
          ? trunc(String(dto.QrCode2), 200)
          : trunc(sec || '-', 200),
      itemcode2:
        dto.itemcode2 != null && String(dto.itemcode2).trim() !== ''
          ? trunc(String(dto.itemcode2), 200)
          : trunc(codeLine, 200),
      num2:
        dto.num2 != null && String(dto.num2).trim() !== ''
          ? trunc(String(dto.num2), 200)
          : trunc(serialLine, 200),
      num3:
        dto.num3 != null && String(dto.num3).trim() !== ''
          ? trunc(String(dto.num3), 200)
          : trunc(lotLine, 200),
      num4:
        dto.num4 != null && String(dto.num4).trim() !== ''
          ? trunc(String(dto.num4), 200)
          : trunc(expLine, 200),
    };
  }
}
