import type { CSSProperties, ReactNode } from 'react';
import { formatCEToDMY } from '@/lib/datePickerBE';
import { cn } from '@/lib/utils';
import type { PrintStickerConfirmLine } from './PrintStickerConfirmDialog';

/**
 * กว้าง 700 จุดจาก SBPL A107500700, สูงฉลากจริงประมาณ 420 จุด
 * ตำแหน่งทั้งหมดเป็นจุด วัดจากมุมซ้ายบนของฉลาก
 */
export const STICKER_H_DOTS = 700;
export const STICKER_V_DOTS = 420;

/** 2D30 cell size 8 จุด × QR version 1 (21 โมดูล) */
const QR_MODULES = 21;
const QR_DOTS = 8 * QR_MODULES;

const PAD_X = 36;
const QR_SIZE = QR_DOTS;

const PREVIEW_WIDTH_PX = {
  hero: 360,
  thumb: 168,
  zoom: 480,
} as const;

function box(x: number, y: number, w: number, h: number, scale: number): CSSProperties {
  return {
    position: 'absolute',
    left: x * scale,
    top: y * scale,
    width: w * scale,
    height: h * scale,
  };
}

function Text({
  x,
  y,
  size,
  scale,
  maxWidth,
  className,
  children,
}: {
  x: number;
  y: number;
  size: number;
  scale: number;
  maxWidth?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: x * scale,
        top: y * scale,
        fontSize: size * scale,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontFamily: 'Tahoma, "Noto Sans Thai", sans-serif',
        ...(maxWidth
          ? {
              maxWidth: maxWidth * scale,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }
          : {}),
      }}
    >
      {children}
    </div>
  );
}

function QrMark({ value }: { value: string }) {
  const n = QR_MODULES;
  const cells: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const paintFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || c === 0 || r === 6 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[row + r][col + c] = edge || core;
      }
    }
  };
  paintFinder(0, 0);
  paintFinder(0, n - 7);
  paintFinder(n - 7, 0);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8);
      if (inFinder) continue;
      hash = Math.imul(hash ^ (r * n + c + 1), 16777619);
      cells[r][c] = (hash >>> 0) % 5 < 2;
    }
  }
  const size = 100;
  const cell = size / n;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" shapeRendering="crispEdges" aria-hidden>
      <rect width={size} height={size} fill="#fff" />
      {cells.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111" /> : null,
        ),
      )}
    </svg>
  );
}

function displayOrDash(value?: string | null) {
  const text = value?.trim();
  return text ? text : '-';
}

function usageCodeYm(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: '2-digit',
    month: '2-digit',
  }).formatToParts(now);
  const yy = parts.find((p) => p.type === 'year')?.value ?? '';
  const mm = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${yy}${mm}`;
}

export function formatItemUsageCode(itemcode: string, seq = 1): string {
  return `${itemcode}-${usageCodeYm()}-${String(seq).padStart(5, '0')}`;
}

export function StickerLabelPreview({
  line,
  size = 'hero',
  className,
}: {
  line: PrintStickerConfirmLine;
  size?: keyof typeof PREVIEW_WIDTH_PX;
  className?: string;
}) {
  const widthPx = PREVIEW_WIDTH_PX[size];
  const heightPx = (widthPx * STICKER_V_DOTS) / STICKER_H_DOTS;
  const scale = widthPx / STICKER_H_DOTS;
  const name = line.itemname?.trim() || line.itemcode;
  const code = line.itemcode;
  const usage = line.usageCode?.trim() || formatItemUsageCode(code);
  const lot = displayOrDash(line.lotNo);
  const exp = formatCEToDMY(line.expireDate) || displayOrDash(line.expireDate);

  const nameY = 24;
  const usageY = 62;
  const bodyTop = 104;
  const infoX = PAD_X + QR_SIZE + 28;
  const infoGap = 38;
  const expH = 44;
  const qrY = bodyTop + 8;
  const infoY = qrY + 16;
  const expY = infoY + infoGap * 2 + 34;
  const expW = STICKER_H_DOTS - infoX - PAD_X;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm',
        className,
      )}
      style={{ width: widthPx, height: heightPx }}
    >
      <Text
        x={PAD_X}
        y={nameY}
        size={32}
        scale={scale}
        maxWidth={STICKER_H_DOTS - PAD_X * 2}
        className="font-semibold text-black"
      >
        {name}
      </Text>
      <Text
        x={PAD_X}
        y={usageY}
        size={18}
        scale={scale}
        maxWidth={STICKER_H_DOTS - PAD_X * 2}
        className="text-slate-600"
      >
        {code} | {usage}
      </Text>

      <div style={box(PAD_X, qrY, QR_SIZE, QR_SIZE, scale)}>
        <QrMark value={code} />
      </div>
      <Text
        x={PAD_X}
        y={qrY + QR_SIZE + 8}
        size={13}
        scale={scale}
        maxWidth={QR_SIZE}
        className="text-slate-700"
      >
        {code} | {usage}
      </Text>

      <Text x={infoX} y={infoY} size={26} scale={scale} className="text-black">
        Code : {code}
      </Text>
      <Text x={infoX} y={infoY + infoGap} size={26} scale={scale} className="text-black">
        Serial No : -
      </Text>
      <Text x={infoX} y={infoY + infoGap * 2} size={26} scale={scale} className="text-black">
        Lot No : {lot}
      </Text>

      <div
        className="flex items-center bg-black px-[3%]"
        style={box(infoX, expY, expW, expH, scale)}
      >
        <span
          className="font-bold leading-none text-white"
          style={{ fontSize: 26 * scale, fontFamily: 'Tahoma, sans-serif' }}
        >
          EXP: {exp}
        </span>
      </div>
    </div>
  );
}
