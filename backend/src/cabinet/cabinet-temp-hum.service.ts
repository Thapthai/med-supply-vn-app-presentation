import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CabinetSummary = {
  id: number;
  cabinet_name: string | null;
  cabinet_code: string | null;
  stock_id: number | null;
  temp_min: number | null;
  temp_max: number | null;
  hum_min: number | null;
  hum_max: number | null;
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
  temp_min: number | null;
  temp_max: number | null;
  hum_min: number | null;
  hum_max: number | null;
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

  private toNullableNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private climateOf(cabinet: {
    temp_min: Prisma.Decimal | number | string | null;
    temp_max: Prisma.Decimal | number | string | null;
    hum_min: Prisma.Decimal | number | string | null;
    hum_max: Prisma.Decimal | number | string | null;
  }): Pick<CabinetSummary, 'temp_min' | 'temp_max' | 'hum_min' | 'hum_max'> {
    return {
      temp_min: this.toNullableNumber(cabinet.temp_min),
      temp_max: this.toNullableNumber(cabinet.temp_max),
      hum_min: this.toNullableNumber(cabinet.hum_min),
      hum_max: this.toNullableNumber(cabinet.hum_max),
    };
  }

  private async cabinetsByIdsOrStock(ids: number[]): Promise<CabinetSummary[]> {
    const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
    if (unique.length === 0) return [];
    const rows = await this.prisma.cabinet.findMany({
      where: {
        OR: [{ id: { in: unique } }, { stock_id: { in: unique } }],
      },
      select: {
        id: true,
        cabinet_name: true,
        cabinet_code: true,
        stock_id: true,
        temp_min: true,
        temp_max: true,
        hum_min: true,
        hum_max: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      cabinet_name: row.cabinet_name,
      cabinet_code: row.cabinet_code,
      stock_id: row.stock_id,
      ...this.climateOf(row),
    }));
  }

  private matchAppCabinet(logCabinetId: number, cabinets: CabinetSummary[]): CabinetSummary | null {
    return (
      cabinets.find((c) => c.stock_id === logCabinetId) ??
      cabinets.find((c) => c.id === logCabinetId) ??
      null
    );
  }

  private mapLogs(logs: CabinetTempHumLogPoint[] | { id: number; create_date: Date; temp_log: Prisma.Decimal | number | string; hum_log: Prisma.Decimal | number | string }[]) {
    return logs.map((r) => ({
      id: r.id,
      create_date: r.create_date,
      temp_log: this.toNumber(r.temp_log),
      hum_log: this.toNumber(r.hum_log),
    }));
  }

  private toOverviewRow(
    logCabinetId: number,
    app: CabinetSummary | null,
    logs: { id: number; create_date: Date; temp_log: Prisma.Decimal | number | string; hum_log: Prisma.Decimal | number | string }[],
    includeLogs: boolean,
  ): CabinetTempHumChartCabinet {
    const latest = logs[0] ?? null;
    return {
      log_cabinet_id: logCabinetId,
      app_cabinet_id: app?.id ?? null,
      cabinet_name: app?.cabinet_name ?? null,
      cabinet_code: app?.cabinet_code ?? null,
      last_log_at: latest?.create_date ?? null,
      latest_temp: latest != null ? this.toNumber(latest.temp_log) : null,
      latest_hum: latest != null ? this.toNumber(latest.hum_log) : null,
      temp_min: app?.temp_min ?? null,
      temp_max: app?.temp_max ?? null,
      hum_min: app?.hum_min ?? null,
      hum_max: app?.hum_max ?? null,
      log_count: logs.length,
      logs: includeLogs ? this.mapLogs(logs) : [],
    };
  }

  async listCabinetsForLogs(
    range?: { from: Date; to: Date },
    options?: { includeLogs?: boolean; includeEmptyCabinets?: boolean },
  ): Promise<CabinetTempHumChartCabinet[]> {
    const includeLogs = options?.includeLogs === true;
    const includeEmptyCabinets = options?.includeEmptyCabinets === true;
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

    const everLoggedIds = includeEmptyCabinets
      ? (await this.prisma.cabinetTempHumLog.groupBy({ by: ['cabinet_id'] })).map((row) => row.cabinet_id)
      : [...latestByCabinet.keys()];
    const appCabinets = await this.cabinetsByIdsOrStock(everLoggedIds);

    const usedLogIds = new Set<number>();
    const result: CabinetTempHumChartCabinet[] = [];

    if (includeEmptyCabinets) {
      for (const logCabinetId of everLoggedIds) {
        usedLogIds.add(logCabinetId);
        const app = this.matchAppCabinet(logCabinetId, appCabinets);
        result.push(this.toOverviewRow(logCabinetId, app, logsByCabinet.get(logCabinetId) ?? [], includeLogs));
      }
    } else {
      const latestRows = [...latestByCabinet.values()].sort(
        (a, b) => b.create_date.getTime() - a.create_date.getTime(),
      );
      for (const row of latestRows) {
        usedLogIds.add(row.cabinet_id);
        const app = this.matchAppCabinet(row.cabinet_id, appCabinets);
        result.push(this.toOverviewRow(row.cabinet_id, app, logsByCabinet.get(row.cabinet_id) ?? [row], includeLogs));
      }
    }

    for (const [logCabinetId, logs] of logsByCabinet) {
      if (usedLogIds.has(logCabinetId)) continue;
      result.push(this.toOverviewRow(logCabinetId, this.matchAppCabinet(logCabinetId, appCabinets), logs, includeLogs));
    }

    return result.sort((a, b) => {
      const aTime = a.last_log_at?.getTime() ?? 0;
      const bTime = b.last_log_at?.getTime() ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      const aName = a.cabinet_name?.trim() || a.cabinet_code?.trim() || `ตู้ #${a.log_cabinet_id}`;
      const bName = b.cabinet_name?.trim() || b.cabinet_code?.trim() || `ตู้ #${b.log_cabinet_id}`;
      return aName.localeCompare(bName, 'th');
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
          temp_min: true,
          temp_max: true,
          hum_min: true,
          hum_max: true,
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
          app: { ...cab, ...this.climateOf(cab) },
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
          temp_min: true,
          temp_max: true,
          hum_min: true,
          hum_max: true,
        },
      });
      return {
        logCabinetId: first.log_cabinet_id,
        app: cab ? { ...cab, ...this.climateOf(cab) } : null,
      };
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

  private clockTimesFromDates(dates: Date[]): string[] {
    const set = new Set<string>();
    for (const at of dates) {
      set.add(
        `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}`,
      );
    }
    return [...set].sort();
  }

  async getOverview(query: { year?: number; month?: number }) {
    const range = this.resolveRange(query);
    const cabinets = await this.listCabinetsForLogs(
      { from: range.from, to: range.to },
      { includeLogs: true, includeEmptyCabinets: true },
    );
    let timeSlots = this.clockTimesFromDates(cabinets.flatMap((c) => c.logs.map((log) => log.create_date)));
    if (timeSlots.length === 0) {
      const recent = await this.prisma.cabinetTempHumLog.findMany({
        orderBy: { create_date: 'desc' },
        take: 400,
        select: { create_date: true },
      });
      timeSlots = this.clockTimesFromDates(recent.map((row) => row.create_date));
    }
    return {
      cabinets,
      range: {
        hours: range.hours,
        year: range.year,
        month: range.month,
        from: range.from,
        to: range.to,
      },
      time_slots: timeSlots,
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
        temp_min: app?.temp_min ?? null,
        temp_max: app?.temp_max ?? null,
        hum_min: app?.hum_min ?? null,
        hum_max: app?.hum_max ?? null,
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
