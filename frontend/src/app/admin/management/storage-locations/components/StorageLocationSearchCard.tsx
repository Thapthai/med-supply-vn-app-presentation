'use client';

import { useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type StorageLocationSearchCardProps = {
  description?: string;
  loading?: boolean;
  onSearch: (keyword: string) => void;
  onReset?: () => void;
  onRefresh?: () => void;
};

export default function StorageLocationSearchCard({
  description = 'ค้นจากรหัสหรือชื่อ Item แล้วกดค้นหา',
  loading = false,
  onSearch,
  onReset,
  onRefresh,
}: StorageLocationSearchCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const handleSearch = () => {
    const kw = searchTerm.trim();
    setAppliedKeyword(kw);
    onSearch(kw);
  };

  const handleClear = () => {
    setSearchTerm('');
    setAppliedKeyword('');
    onReset?.();
    onSearch('');
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="storage-location-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="storage-location-keyword"
                placeholder="เช่น รหัส Item, ชื่อเวชภัณฑ์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="h-10 bg-white pl-9 shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={handleSearch} className="h-10 gap-2" disabled={loading}>
              <Search className="h-4 w-4" />
              ค้นหา
            </Button>
            {onRefresh ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={onRefresh}
                disabled={loading}
                aria-label="รีเฟรช"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            ) : null}
          </div>
        </div>

        {appliedKeyword ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              คำค้น: {appliedKeyword}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={handleClear}
              disabled={loading}
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
