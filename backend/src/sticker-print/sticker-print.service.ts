import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PrintLabelItemDto } from './dto/print-label-item.dto';
import type { PrintLabelItemsDto } from './dto/print-label-items.dto';
import type { PrintSatoSbplDto } from './dto/print-sato-sbpl.dto';
import type {
  CreateStickerPrintHistoryDto,
  GetStickerPrintHistoryQueryDto,
} from './dto/sticker-print-history.dto';

type HistoryLineInput = {
  itemcode: string;
  item_name?: string | null;
  copies: number;
  expire_date?: string | null;
  bytes_sent?: number;
};

type RecordHistoryInput = {
  printedByUserId?: number;
  source: string;
  host?: string | null;
  port?: number | null;
  template?: string | null;
  status?: 'SUCCESS' | 'ERROR';
  remark?: string | null;
  departmentId?: number | null;
  cabinetId?: number | null;
  lines: HistoryLineInput[];
};

@Injectable()
export class StickerPrintService {
  private readonly logger = new Logger(StickerPrintService.name);

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
    printedByUserId?: number,
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
    await this.recordHistorySafe({
      printedByUserId,
      source: 'printLabel',
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      lines: [{ itemcode: 'TEST', item_name: 'ทดพิมพ์', copies: 1, bytes_sent: bytesSent }],
    });
    return { success: true, bytesSent, host, port: resolvedPort, template: 'SBPL1.txt' };
  }

  /** พิมพ์ฉลากจาก Item master — SBPL1 + token จากฟิลด์ item (override จาก body ได้) */
  async printLabelItem(
    dto: PrintLabelItemDto,
    printedByUserId?: number,
  ): Promise<{
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
    await this.recordHistorySafe({
      printedByUserId,
      source: 'printLabel-item',
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      lines: [
        {
          itemcode: item.itemcode,
          item_name: item.itemname,
          copies: 1,
          expire_date: tokens.num4 && /^\d{4}-\d{2}-\d{2}$/.test(tokens.num4) ? tokens.num4 : null,
          bytes_sent: bytesSent,
        },
      ],
    });
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
  async printLabelItems(
    dto: PrintLabelItemsDto,
    printedByUserId?: number,
  ): Promise<{
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

    await this.recordHistorySafe({
      printedByUserId,
      source: 'printLabel-items',
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      departmentId: dto.department_id,
      cabinetId: dto.cabinet_id,
      lines: items.map((row, idx) => ({
        itemcode: row.itemcode,
        item_name: byCode.get(row.itemcode)?.itemname,
        copies: row.copies,
        expire_date: entries[idx]?.expire_date ?? null,
        bytes_sent: row.bytesSent,
      })),
    });

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

  async createHistory(dto: CreateStickerPrintHistoryDto, printedByUserId?: number) {
    const lines: HistoryLineInput[] = dto.items.map((l) => ({
      itemcode: l.itemcode.trim(),
      item_name: l.item_name?.trim() || null,
      copies: l.copies != null ? Math.min(50, Math.max(1, Math.floor(l.copies))) : 1,
      expire_date: l.expire_date?.trim() || null,
      bytes_sent: l.bytes_sent ?? 0,
    }));
    const row = await this.recordHistory({
      printedByUserId,
      source: (dto.source ?? 'manual').trim() || 'manual',
      host: dto.host?.trim() || null,
      port: dto.port ?? null,
      template: dto.template?.trim() || null,
      status: dto.status ?? 'SUCCESS',
      remark: dto.remark?.trim() || null,
      departmentId: dto.department_id,
      cabinetId: dto.cabinet_id,
      lines,
    });
    return { success: true as const, data: row };
  }

  async listHistory(query: GetStickerPrintHistoryQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StickerPrintHistoryWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.source?.trim()) where.source = query.source.trim();
    if (query.printed_by_user_id != null) where.printed_by_user_id = query.printed_by_user_id;
    if (query.department_id != null) where.department_id = query.department_id;
    if (query.cabinet_id != null) where.cabinet_id = query.cabinet_id;

    const range: Prisma.DateTimeFilter = {};
    if (query.startDate?.trim()) {
      const start = new Date(`${query.startDate.trim()}T00:00:00.000`);
      if (!Number.isNaN(start.getTime())) range.gte = start;
    }
    if (query.endDate?.trim()) {
      const end = new Date(`${query.endDate.trim()}T23:59:59.999`);
      if (!Number.isNaN(end.getTime())) range.lte = end;
    }
    if (range.gte || range.lte) where.printed_at = range;

    const itemcode = query.itemcode?.trim();
    const keyword = query.keyword?.trim();
    if (itemcode || keyword) {
      const and: Prisma.StickerPrintHistoryWhereInput[] = [];
      if (itemcode) {
        and.push({ lines: { some: { itemcode } } });
      }
      if (keyword) {
        and.push({
          OR: [
            { doc_no: { contains: keyword } },
            {
              lines: {
                some: {
                  OR: [
                    { itemcode: { contains: keyword } },
                    { item_name: { contains: keyword } },
                  ],
                },
              },
            },
          ],
        });
      }
      where.AND = and;
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stickerPrintHistory.count({ where }),
      this.prisma.stickerPrintHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { printed_at: 'desc' },
        include: {
          printedBy: { select: { id: true, email: true, fname: true, lname: true } },
          department: { select: { ID: true, DepName: true, DepName2: true } },
          cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true } },
          lines: { orderBy: { line_order: 'asc' } },
        },
      }),
    ]);

    return {
      success: true as const,
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getHistory(id: number) {
    const row = await this.prisma.stickerPrintHistory.findUnique({
      where: { id },
      include: {
        printedBy: { select: { id: true, email: true, fname: true, lname: true } },
        department: { select: { ID: true, DepName: true, DepName2: true } },
        cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true } },
        lines: { orderBy: { line_order: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException(`ไม่พบประวัติการพิมพ์ id ${id}`);
    }
    return { success: true as const, data: row };
  }

  private async generateDocNo(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `STK-${y}${m}${d}-`;
    const last = await this.prisma.stickerPrintHistory.findFirst({
      where: { doc_no: { startsWith: prefix } },
      orderBy: { doc_no: 'desc' },
      select: { doc_no: true },
    });
    const lastSeq = last?.doc_no ? parseInt(last.doc_no.slice(prefix.length), 10) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  private async recordHistorySafe(input: RecordHistoryInput): Promise<void> {
    try {
      await this.recordHistory(input);
    } catch (err) {
      this.logger.error(
        `บันทึกประวัติพิมพ์สติ๊กเกอร์ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async recordHistory(input: RecordHistoryInput) {
    const lines = input.lines.filter((l) => l.itemcode.trim().length > 0);
    if (lines.length === 0) {
      throw new BadRequestException('ต้องมีรายการอย่างน้อย 1 แถว');
    }

    const missingNames = [
      ...new Set(lines.filter((l) => !l.item_name?.trim()).map((l) => l.itemcode.trim())),
    ];
    const nameByCode = new Map<string, string | null>();
    if (missingNames.length > 0) {
      const items = await this.prisma.item.findMany({
        where: { itemcode: { in: missingNames } },
        select: { itemcode: true, itemname: true },
      });
      for (const it of items) nameByCode.set(it.itemcode, it.itemname);
    }

    const totalCopies = lines.reduce((s, l) => s + l.copies, 0);
    const totalBytes = lines.reduce((s, l) => s + (l.bytes_sent ?? 0), 0);

    const location = await this.resolveCabinetDepartment(input.departmentId, input.cabinetId);
    const doc_no = await this.generateDocNo();

    return this.prisma.stickerPrintHistory.create({
      data: {
        doc_no,
        printed_by_user_id: input.printedByUserId ?? null,
        source: input.source,
        host: input.host ?? null,
        port: input.port ?? null,
        template: input.template ?? null,
        department_id: location.department_id,
        cabinet_id: location.cabinet_id,
        department_name: location.department_name,
        cabinet_name: location.cabinet_name,
        line_count: lines.length,
        total_copies: totalCopies,
        total_bytes_sent: totalBytes,
        status: input.status ?? 'SUCCESS',
        remark: input.remark ?? null,
        lines: {
          create: lines.map((l, idx) => ({
            line_order: idx,
            itemcode: l.itemcode.trim(),
            item_name: l.item_name?.trim() || nameByCode.get(l.itemcode.trim()) || null,
            copies: l.copies,
            expire_date: l.expire_date?.trim() || null,
            bytes_sent: l.bytes_sent ?? 0,
          })),
        },
      },
      include: {
        printedBy: { select: { id: true, email: true, fname: true, lname: true } },
        department: { select: { ID: true, DepName: true, DepName2: true } },
        cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true } },
        lines: { orderBy: { line_order: 'asc' } },
      },
    });
  }

  /** หาแผนก+ตู้จาก app_cabinet_departments แล้ว snapshot ชื่อ */
  private async resolveCabinetDepartment(
    departmentId?: number | null,
    cabinetId?: number | null,
  ): Promise<{
    department_id: number | null;
    cabinet_id: number | null;
    department_name: string | null;
    cabinet_name: string | null;
  }> {
    const empty = {
      department_id: null as number | null,
      cabinet_id: null as number | null,
      department_name: null as string | null,
      cabinet_name: null as string | null,
    };
    if (!departmentId && !cabinetId) return empty;

    const mapping = await this.prisma.cabinetDepartment.findFirst({
      where: {
        status: 'ACTIVE',
        ...(departmentId ? { department_id: departmentId } : {}),
        ...(cabinetId ? { cabinet_id: cabinetId } : {}),
      },
      include: {
        department: { select: { ID: true, DepName: true, DepName2: true } },
        cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true } },
      },
      orderBy: { id: 'desc' },
    });

    if (mapping) {
      const depName =
        `${mapping.department?.DepName ?? ''} ${mapping.department?.DepName2 ? `(${mapping.department.DepName2})` : ''}`.trim() ||
        null;
      const cabName =
        (mapping.cabinet?.cabinet_name ?? mapping.cabinet?.cabinet_code ?? '').trim() || null;
      return {
        department_id: mapping.department_id ?? departmentId ?? null,
        cabinet_id: mapping.cabinet_id ?? cabinetId ?? null,
        department_name: depName,
        cabinet_name: cabName,
      };
    }

    const [department, cabinet] = await Promise.all([
      departmentId
        ? this.prisma.department.findUnique({
            where: { ID: departmentId },
            select: { ID: true, DepName: true, DepName2: true },
          })
        : null,
      cabinetId
        ? this.prisma.cabinet.findUnique({
            where: { id: cabinetId },
            select: { id: true, cabinet_name: true, cabinet_code: true },
          })
        : null,
    ]);

    return {
      department_id: department?.ID ?? null,
      cabinet_id: cabinet?.id ?? null,
      department_name:
        department
          ? `${department.DepName ?? ''} ${department.DepName2 ? `(${department.DepName2})` : ''}`.trim() ||
            null
          : null,
      cabinet_name: (cabinet?.cabinet_name ?? cabinet?.cabinet_code ?? '').trim() || null,
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
