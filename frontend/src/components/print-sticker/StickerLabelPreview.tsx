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

/** SATO 203 dpi ≈ 8 จุด/มม. — หัวสีฟ้าบนฉลากจริงสูงประมาณ 1 ซม. */
const DOTS_PER_MM = 8;
const HEADER_DOTS = 10 * DOTS_PER_MM;

/** 2D30 cell size 8 จุด × QR version 1 (21 โมดูล) */
const QR_MODULES = 21;
const QR_DOTS = 8 * QR_MODULES;

const LEFT_COL_X = 50;
const RIGHT_COL_X = 250;

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
  const lot = displayOrDash(line.lotNo);
  const exp = formatCEToDMY(line.expireDate) || displayOrDash(line.expireDate);

  const nameY = HEADER_DOTS + 12;
  const qrY = nameY + 40;
  const infoY = qrY + 6;
  const expY = infoY + 138;
  const barH = 32;
  const barGap = 10;
  const barY = STICKER_V_DOTS - barH * 2 - barGap - 8;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm',
        className,
      )}
      style={{ width: widthPx, height: heightPx }}
    >
      <div
        className="flex items-center justify-between bg-[#7ec8e3] px-[4%] text-[#1e3a5f]"
        style={box(0, 0, STICKER_H_DOTS, HEADER_DOTS, scale)}
      >
        <span className="font-semibold leading-none" style={{ fontSize: 36 * scale }}>
          รายการ
        </span>
        <span className="text-right font-bold leading-none tracking-wide text-white">
          <span className="block" style={{ fontSize: 34 * scale }}>
            POSE
          </span>
          <span
            className="mt-[0.1em] block font-semibold tracking-[0.12em]"
            style={{ fontSize: 13 * scale }}
          >
            INTELLIGENCE
          </span>
        </span>
      </div>

      <Text x={LEFT_COL_X} y={nameY} size={30} scale={scale} maxWidth={STICKER_H_DOTS - LEFT_COL_X * 2} className="text-black">
        {name}
      </Text>

      <div style={box(LEFT_COL_X, qrY, QR_DOTS, QR_DOTS, scale)}>
        <QrMark value={code} />
      </div>
      <Text x={LEFT_COL_X} y={qrY + QR_DOTS + 8} size={18} scale={scale} className="text-black">
        {code}
      </Text>

      <Text x={RIGHT_COL_X} y={infoY} size={30} scale={scale} className="text-black">
        Code : {code}
      </Text>
      <Text x={RIGHT_COL_X} y={infoY + 44} size={30} scale={scale} className="text-black">
        Serial No : -
      </Text>
      <Text x={RIGHT_COL_X} y={infoY + 88} size={30} scale={scale} className="text-black">
        Lot No : {lot}
      </Text>

      <div className="flex items-center bg-black px-[2%]" style={box(RIGHT_COL_X - 10, expY, 440, 50, scale)}>
        <span
          className="font-bold leading-none text-white"
          style={{ fontSize: 30 * scale, fontFamily: 'Tahoma, sans-serif' }}
        >
          EXP: {exp}
        </span>
      </div>

      <div className="bg-[#7ec8e3]" style={box(RIGHT_COL_X - 10, barY, 440, barH, scale)} />
      <div className="bg-[#f5d90a]" style={box(RIGHT_COL_X - 10, barY + barH + barGap, 440, barH, scale)} />
    </div>
  );
}
