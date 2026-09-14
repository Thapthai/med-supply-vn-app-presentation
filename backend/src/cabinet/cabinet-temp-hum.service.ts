import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CabinetSummary = {
  id: number;
  cabinet_name: string | null;
  cabinet_code: string | null;
  stock_id: number | null;
};

export type CabinetTempHumLogPoint = {
  id: number;
  create_date: Date;
  temp_log: number;
  hum_log: number;
};

export type CabinetTempHumChartCabinet = {
  log_cabinet_id: number;
  app_cabinet_id: number | null;
  cabinet_name: string | null;
  cabinet_code: string | null;
  last_log_at: Date | null;
  latest_temp: number | null;
  latest_hum: number | null;
  log_count: number;
  logs: CabinetTempHumLogPoint[];
};

function monthRange(year: number, month: number): { from: Date; to: Date } {
  return {
    from: new Date(year, month - 1, 1, 0, 0, 0, 0),
    to: new Date(year, month, 1, 0, 0, 0, 0),
  };
}

@Injectable()
export class CabinetTempHumService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value == null) return 0;
    return Number(value);
  }

  private async cabinetsByIdsOrStock(ids: number[]): Promise<CabinetSummary[]> {
    const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
    if (unique.length === 0) return [];
    return this.prisma.cabinet.findMany({
      where: {
        OR: [{ id: { in: unique } }, { stock_id: { in: unique } }],
      },
      select: {
        id: true,
        cabinet_name: true,
        cabinet_code: true,
        stock_id: true,
      },
    });
  }

  private matchAppCabinet(logCabinetId: number, cabinets: CabinetSummary[]): CabinetSummary | null {
    return (
      cabinets.find((c) => c.stock_id === logCabinetId) ??
      cabinets.find((c) => c.id === logCabinetId) ??
      null
    );
  }

  async listCabinetsForLogs(
    range?: { from: Date; to: Date },
    options?: { includeLogs?: boolean },
  ): Promise<CabinetTempHumChartCabinet[]> {
    const includeLogs = options?.includeLogs === true;
    const rows = await this.prisma.cabinetTempHumLog.findMany({
      where: range ? { create_date: { gte: range.from, lt: range.to } } : undefined,
      orderBy: { create_date: 'desc' },
    });
    const logsByCabinet = new Map<number, typeof rows>();
    const latestByCabinet = new Map<number, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByCabinet.has(row.cabinet_id)) latestByCabinet.set(row.cabinet_id, row);
      const list = logsByCabinet.get(row.cabinet_id);
      if (list) list.push(row);
      else logsByCabinet.set(row.cabinet_id, [row]);
    }

    const latestRows = [...latestByCabinet.values()].sort((a, b) => {
      return b.create_date.getTime() - a.create_date.getTime();
    });
    const cabinets = await this.cabinetsByIdsOrStock(latestRows.map((r) => r.cabinet_id));

    return latestRows.map((row) => {
      const app = this.matchAppCabinet(row.cabinet_id, cabinets);
      const logs = logsByCabinet.get(row.cabinet_id) ?? [row];
      return {
        log_cabinet_id: row.cabinet_id,
        app_cabinet_id: app?.id ?? null,
        cabinet_name: app?.cabinet_name ?? null,
        cabinet_code: app?.cabinet_code ?? null,
        last_log_at: row.create_date,
        latest_temp: this.toNumber(row.temp_log),
        latest_hum: this.toNumber(row.hum_log),
        log_count: logs.length,
        logs: includeLogs
          ? logs.map((r) => ({
              id: r.id,
              create_date: r.create_date,
              temp_log: this.toNumber(r.temp_log),
              hum_log: this.toNumber(r.hum_log),
            }))
          : [],
      };
    });
  }

  private async resolveLogCabinetId(
    appCabinetId: number | undefined,
    cabinetsForLogs: CabinetTempHumChartCabinet[],
  ): Promise<{ logCabinetId: number | null; app: CabinetSummary | null }> {
    if (appCabinetId != null && Number.isFinite(appCabinetId) && appCabinetId > 0) {
      const cab = await this.prisma.cabinet.findUnique({
        where: { id: appCabinetId },
        select: {
          id: true,
          cabinet_name: true,
          cabinet_code: true,
          stock_id: true,
        },
      });
      if (cab) {
        const candidates = [cab.stock_id, cab.id].filter(
          (n): n is number => n != null && Number.isFinite(n),
        );
        const found = await this.prisma.cabinetTempHumLog.findFirst({
          where: { cabinet_id: { in: candidates } },
          orderBy: { create_date: 'desc' },
          select: { cabinet_id: true },
        });
        return {
          logCabinetId: found?.cabinet_id ?? cab.stock_id ?? cab.id,
          app: cab,
        };
      }

      const logExists = await this.prisma.cabinetTempHumLog.findFirst({
        where: { cabinet_id: appCabinetId },
        select: { cabinet_id: true },
      });
      if (logExists) {
        return { logCabinetId: appCabinetId, app: null };
      }
      return { logCabinetId: null, app: null };
    }

    const first = cabinetsForLogs[0];
    if (!first) return { logCabinetId: null, app: null };
    if (first.app_cabinet_id != null) {
      const cab = await this.prisma.cabinet.findUnique({
        where: { id: first.app_cabinet_id },
        select: {
          id: true,
          cabinet_name: true,
          cabinet_code: true,
          stock_id: true,
        },
      });
      return { logCabinetId: first.log_cabinet_id, app: cab };
    }
    return { logCabinetId: first.log_cabinet_id, app: null };
  }

  private resolveRange(query: { hours?: number; year?: number; month?: number }) {
    if (query.year != null && query.month != null) {
      const { from, to } = monthRange(query.year, query.month);
      return { from, to, hours: null as number | null, year: query.year, month: query.month };
    }
    const hours = query.hours ?? 24 * 30;
    return {
      from: new Date(Date.now() - hours * 60 * 60 * 1000),
      to: new Date(),
      hours,
      year: null as number | null,
      month: null as number | null,
    };
  }

  async getOverview(query: { year?: number; month?: number }) {
    const range = this.resolveRange(query);
    const cabinets = await this.listCabinetsForLogs({ from: range.from, to: range.to }, { includeLogs: true });
    return {
      cabinets,
      range: {
        hours: range.hours,
        year: range.year,
        month: range.month,
        from: range.from,
        to: range.to,
      },
    };
  }

  async getChart(query: {
    cabinet_id?: number;
    hours?: number;
    year?: number;
    month?: number;
    limit?: number;
  }) {
    const limit = query.limit ?? 300;
    const range = this.resolveRange(query);
    const cabinets = await this.listCabinetsForLogs({ from: range.from, to: range.to });
    const { logCabinetId, app } = await this.resolveLogCabinetId(query.cabinet_id, cabinets);

    if (logCabinetId == null) {
      return {
        cabinets,
        selected: null,
        latest: null,
        stats: null,
        points: [] as { create_date: Date; temp_log: number; hum_log: number }[],
        range: {
          hours: range.hours,
          year: range.year,
          month: range.month,
          from: range.from,
          to: range.to,
          used_fallback: false,
        },
      };
    }

    let rows = await this.prisma.cabinetTempHumLog.findMany({
      where: {
        cabinet_id: logCabinetId,
        create_date: { gte: range.from, lt: range.to },
      },
      orderBy: { create_date: 'asc' },
      take: limit,
    });
    let usedFallback = false;

    if (rows.length === 0 && range.year == null) {
      const recent = await this.prisma.cabinetTempHumLog.findMany({
        where: { cabinet_id: logCabinetId },
        orderBy: { create_date: 'desc' },
        take: Math.min(limit, 100),
      });
      rows = recent.reverse();
      usedFallback = rows.length > 0;
    }

    const points = rows.map((r) => ({
      id: r.id,
      create_date: r.create_date,
      temp_log: this.toNumber(r.temp_log),
      hum_log: this.toNumber(r.hum_log),
    }));

    const temps = points.map((p) => p.temp_log);
    const hums = points.map((p) => p.hum_log);
    const latest = points.length > 0 ? points[points.length - 1] : null;
    const first = points.length > 0 ? points[0] : null;
    const stats =
      temps.length > 0
        ? {
            min_temp: Math.min(...temps),
            max_temp: Math.max(...temps),
            avg_temp: Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)),
            min_hum: Math.min(...hums),
            max_hum: Math.max(...hums),
            delta_temp: latest && first ? Number((latest.temp_log - first.temp_log).toFixed(2)) : 0,
          }
        : null;

    return {
      cabinets,
      selected: {
        log_cabinet_id: logCabinetId,
        app_cabinet_id: app?.id ?? null,
        cabinet_name: app?.cabinet_name ?? null,
        cabinet_code: app?.cabinet_code ?? null,
      },
      latest: latest
        ? {
            create_date: latest.create_date,
            temp_log: latest.temp_log,
            hum_log: latest.hum_log,
          }
        : null,
      stats,
      points,
      range: {
        hours: range.hours,
        year: range.year,
        month: range.month,
        from: range.from,
        to: range.to,
        used_fallback: usedFallback,
      },
    };
  }
}
