'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Dispatch, SetStateAction } from 'react';
import type { PreparedStockRow } from '../types';

type Props = {
  preparedRows: PreparedStockRow[];
  selectedPreparedRowIds: number[];
  onSelectedPreparedRowIdsChange: Dispatch<SetStateAction<number[]>>;
  deletingPrepared: boolean;
  printing: boolean;
  preparing: boolean;
  onDeletePrepared: () => void;
  onPrint: () => void;
};

export default function PrintStickerPreparedCard({
  preparedRows,
  selectedPreparedRowIds,
  onSelectedPreparedRowIdsChange,
  deletingPrepared,
  printing,
  preparing,
  onDeletePrepared,
  onPrint,
}: Props) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardDescription>ลบรายการที่ไม่ต้องการก่อน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preparedRows.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีรายการที่บันทึกไว้
          </p>
        ) : (
          <div className="max-h-[360px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">เลือก</TableHead>
                  <TableHead className="w-[120px]">RowID</TableHead>
                  <TableHead>itemcode</TableHead>
                  <TableHead>RFID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preparedRows.map((r) => {
                  const checked = selectedPreparedRowIds.includes(r.RowID);
                  return (
                    <TableRow key={r.RowID}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            onSelectedPreparedRowIdsChange((prev) =>
                              v ? [...prev, r.RowID] : prev.filter((id) => id !== r.RowID),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.RowID}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ItemCode ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.RfidCode ?? '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onDeletePrepared}
            disabled={deletingPrepared || selectedPreparedRowIds.length === 0}
          >
            {deletingPrepared ? 'กำลังลบ…' : 'ลบที่เลือก'}
          </Button>
          <Button onClick={onPrint} disabled={printing || preparing || preparedRows.length === 0}>
            {printing ? 'กำลังส่ง…' : `พิมพ์จากรายการที่บันทึกแล้ว (${preparedRows.length})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
