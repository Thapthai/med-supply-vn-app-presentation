import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cabinetApi, cabinetDepartmentApi } from '@/lib/api';
import { cabinetEditFormSchema, type CabinetEditFormData } from '@/lib/validations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Edit } from 'lucide-react';
import {
  CABINET_TYPE_OPTIONS,
  climateInputValue,
  climatePayload,
  divisionLinkLabel,
  MACHINE_IP_PLACEHOLDER,
  machineIpHint,
  normalizeCabinetType,
  stockIdFromMachineIp,
  type CabinetDivisionLink,
} from './cabinetTypes';
import CabinetDivisionPicker, { type DivisionPick } from './CabinetDivisionPicker';

function cabinetStatusToFormValue(status?: string): 'ACTIVE' | 'INACTIVE' {
  return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
}

function resolveCabinetStatusForSave(
  formStatus: 'ACTIVE' | 'INACTIVE',
  previousStatus?: string,
): string {
  if (formStatus === 'INACTIVE') return 'INACTIVE';
  const prev = previousStatus?.trim();
  if (prev && prev.toUpperCase() !== 'INACTIVE') return prev;
  return 'ACTIVE';
}

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  machine_ip?: string | null;
  cabinet_status?: string;
  temp_min?: number | string | null;
  temp_max?: number | string | null;
  hum_min?: number | string | null;
  hum_max?: number | string | null;
  cabinetDepartments?: CabinetDivisionLink[];
}

const fieldInputClass = 'bg-white';

interface EditCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinet: Cabinet | null;
  onSuccess: () => void;
}

export default function EditCabinetDialog({
  open,
  onOpenChange,
  cabinet,
  onSuccess,
}: EditCabinetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<DivisionPick[]>([]);

  const form = useForm<CabinetEditFormData>({
    resolver: zodResolver(cabinetEditFormSchema),
    defaultValues: {
      cabinet_name: '',
      machine_ip: '',
      cabinet_type: 'WEIGHING',
      cabinet_status: 'ACTIVE',
      temp_min: '',
      temp_max: '',
      hum_min: '',
      hum_max: '',
    },
  });

  useEffect(() => {
    if (open && cabinet) {
      form.reset({
        cabinet_name: cabinet.cabinet_name || '',
        machine_ip: cabinet.machine_ip || '',
        cabinet_type: normalizeCabinetType(cabinet.cabinet_type) || 'WEIGHING',
        cabinet_status: cabinetStatusToFormValue(cabinet.cabinet_status),
        temp_min: climateInputValue(cabinet.temp_min),
        temp_max: climateInputValue(cabinet.temp_max),
        hum_min: climateInputValue(cabinet.hum_min),
        hum_max: climateInputValue(cabinet.hum_max),
      });
      setDivisions(
        (cabinet.cabinetDepartments ?? []).map((link) => ({
          id: String(link.department_id),
          label: divisionLinkLabel(link),
        })),
      );
    }
    if (!open) {
      form.reset({
        cabinet_name: '',
        machine_ip: '',
        cabinet_type: 'WEIGHING',
        cabinet_status: 'ACTIVE',
        temp_min: '',
        temp_max: '',
        hum_min: '',
        hum_max: '',
      });
      setDivisions([]);
    }
  }, [open, cabinet, form]);

  const handleSubmit = async (values: CabinetEditFormData) => {
    if (!cabinet) return;

    try {
      setLoading(true);
      const data: {
        cabinet_name: string;
        cabinet_type: string;
        stock_id?: number;
        machine_ip?: string | null;
        cabinet_status: string;
        temp_min: number | null;
        temp_max: number | null;
        hum_min: number | null;
        hum_max: number | null;
      } = {
        cabinet_name: values.cabinet_name.trim(),
        cabinet_type: values.cabinet_type,
        cabinet_status: resolveCabinetStatusForSave(values.cabinet_status, cabinet.cabinet_status),
        temp_min: climatePayload(values.temp_min),
        temp_max: climatePayload(values.temp_max),
        hum_min: climatePayload(values.hum_min),
        hum_max: climatePayload(values.hum_max),
      };
      const stockId = stockIdFromMachineIp(values.machine_ip);
      if (stockId != null) data.stock_id = stockId;
      data.machine_ip = values.machine_ip?.trim() || null;

      const response = await cabinetApi.update(cabinet.id, data);

      if (response.success) {
        const nextIds = new Set(divisions.map((d) => parseInt(d.id, 10)).filter((n) => Number.isFinite(n)));
        const current = cabinet.cabinetDepartments ?? [];
        for (const link of current) {
          if (!nextIds.has(link.department_id)) {
            await cabinetDepartmentApi.delete(link.id);
          }
        }
        const currentIds = new Set(current.map((link) => link.department_id));
        for (const department_id of nextIds) {
          if (!currentIds.has(department_id)) {
            await cabinetDepartmentApi.create({
              cabinet_id: cabinet.id,
              department_id,
              status: 'ACTIVE',
            });
          }
        }
        toast.success('แก้ไขตู้เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขตู้ได้');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขตู้');
    } finally {
      setLoading(false);
    }
  };

  if (!cabinet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>แก้ไขตู้ Cabinet</span>
          </DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลตู้ (รหัสตู้สร้างอัตโนมัติจากระบบ)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>รหัสตู้</Label>
              <Input value={cabinet.cabinet_code || '-'} readOnly className="bg-muted" />
            </div>

            <FormField
              control={form.control}
              name="cabinet_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ประเภทตู้ <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={cn('w-full', fieldInputClass)}>
                        <SelectValue placeholder="เลือกประเภทตู้" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CABINET_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cabinet_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ชื่อตู้ <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น ตู้ A1, ตู้ห้องผ่าตัด"
                      className={fieldInputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="temp_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อุณหภูมิต่ำสุด (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="เช่น 2"
                        className={fieldInputClass}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temp_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อุณหภูมิสูงสุด (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="เช่น 8"
                        className={fieldInputClass}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hum_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ความชื้นต่ำสุด (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="เช่น 30"
                        className={fieldInputClass}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hum_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ความชื้นสูงสุด (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="เช่น 60"
                        className={fieldInputClass}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <CabinetDivisionPicker open={open} values={divisions} onChange={setDivisions} disabled={loading} />

            <FormField
              control={form.control}
              name="machine_ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP เครื่อง</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={MACHINE_IP_PLACEHOLDER}
                      className={fieldInputClass}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {machineIpHint(field.value, cabinet.stock_id)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cabinet_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>สถานะการใช้งาน</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={cn('w-full', fieldInputClass)}>
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">เปิดการใช้งาน</SelectItem>
                      <SelectItem value="INACTIVE">ปิดการใช้งาน</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                disabled={loading}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
