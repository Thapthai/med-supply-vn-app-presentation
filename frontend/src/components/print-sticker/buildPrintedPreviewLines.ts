import type { PrintStickerConfirmLine } from './PrintStickerConfirmDialog';
import { formatItemUsageCode } from './StickerLabelPreview';

type SourceLine = {
  itemcode: string;
  itemname?: string;
  expireDate?: string;
  lotNo?: string;
};

type CreatedRow = {
  ItemCode?: string | null;
  UsageCode?: string | null;
};

export function buildPrintedPreviewLines(
  createdRows: CreatedRow[],
  sourceLines: SourceLine[],
): PrintStickerConfirmLine[] {
  const byCode = new Map(sourceLines.map((line) => [line.itemcode, line]));
  const seqByCode = new Map<string, number>();

  return createdRows.flatMap((row) => {
    const itemcode = row.ItemCode?.trim();
    if (!itemcode) return [];
    const src = byCode.get(itemcode);
    const nextSeq = (seqByCode.get(itemcode) ?? 0) + 1;
    seqByCode.set(itemcode, nextSeq);
    return [
      {
        itemcode,
        itemname: src?.itemname?.trim() || itemcode,
        copies: 1,
        expireDate: src?.expireDate?.trim() || '',
        lotNo: src?.lotNo?.trim() || undefined,
        usageCode: row.UsageCode?.trim() || formatItemUsageCode(itemcode, nextSeq),
      },
    ];
  });
}
