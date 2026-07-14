'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Layers, MapPin, ListChecks } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import StorageLocationWizard from './components/StorageLocationWizard';
import MappedStorageLocationsTab from './components/MappedStorageLocationsTab';

const TABS = [
  {
    value: 'setup',
    label: 'ตั้งค่าตำแหน่ง',
    icon: MapPin,
    iconClass: 'bg-indigo-100 text-indigo-700',
  },
  {
    value: 'mapped',
    label: 'ตำแหน่งที่ mapping แล้ว',
    icon: ListChecks,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
] as const;

export default function AdminStorageLocationsPage() {
  const [activeTab, setActiveTab] = useState<string>('setup');

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-100 p-2.5">
              <Layers className="h-7 w-7 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ตำแหน่งจัดเก็บอุปกรณ์</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                ตั้งค่าและดูตำแหน่งจัดเก็บอุปกรณ์ (Row / Rack / Shelf / Qty)
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                            : 'border-slate-200 hover:bg-muted/40',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            tab.iconClass,
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 space-y-0.5">
                          <span className="block text-base font-medium text-slate-900 sm:text-lg">
                            {tab.label}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <TabsContent value="setup">
              <StorageLocationWizard />
            </TabsContent>

            <TabsContent value="mapped">
              <MappedStorageLocationsTab />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
