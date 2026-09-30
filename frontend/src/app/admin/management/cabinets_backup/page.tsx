'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Package, Building2, Network } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import CabinetTab from './components/cabinet-tab/CabinetTab';
import DivisionTab from './components/division-tab/DivisionTab';
import CabinetDivisionTab from './components/cabinet-division-tab/CabinetDivisionTab';

const TABS = [
  {
    value: 'cabinet',
    label: 'จัดการตู้ Cabinet',
    icon: Package,
    iconClass: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'division',
    label: 'จัดการ Division',
    icon: Building2,
    iconClass: 'bg-cyan-100 text-cyan-700',
  },
  {
    value: 'cabinet-division',
    label: 'จัดการตู้ Cabinet - Division',
    icon: Network,
    iconClass: 'bg-purple-100 text-purple-700',
  },
] as const;

export default function CabinetsPage() {
  const [activeTab, setActiveTab] = useState<string>('cabinet');

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการ Cabinet และ Division</h1>
              <p className="text-sm text-gray-500">จัดการตู้ Cabinet, Division และการเชื่อมโยง</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="grid gap-3 sm:grid-cols-3">
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

            <TabsContent value="cabinet">
              <CabinetTab />
            </TabsContent>

            <TabsContent value="division">
              <DivisionTab />
            </TabsContent>

            <TabsContent value="cabinet-division">
              <CabinetDivisionTab />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
