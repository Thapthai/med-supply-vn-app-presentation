import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cabinetApi, cabinetDepartmentApi } from '@/lib/api';
import { cabinetFormSchema, type CabinetFormData } from '@/lib/validations';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CABINET_TYPE_OPTIONS,
  climatePayload,
  MACHINE_IP_PLACEHOLDER,
  machineIpHint,
  stockIdFromMachineIp,
} from './cabinetTypes';
import CabinetDivisionPicker, { type DivisionPick } from './CabinetDivisionPicker';

const fieldInputClass = 'bg-white';

interface CreateCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const defaultValues: CabinetFormData = {
  cabinet_name: '',
  machine_ip: '',
  cabinet_type: 'WEIGHING',
  temp_min: '',
  temp_max: '',
  hum_min: '',
  hum_max: '',
};

export default function CreateCabinetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCabinetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<DivisionPick[]>([]);

  const form = useForm<CabinetFormData>({
    resolver: zodResolver(cabinetFormSchema),
    defaultValues,
  });
  const cabinetType = form.watch('cabinet_type');

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
      setDivisions([]);
    }
  }, [open, form]);

  const handleSubmit = async (values: CabinetFormData) => {
    try {
      setLoading(true);
      const divisionIds = divisions.map((d) => parseInt(d.id, 10)).filter((n) => Number.isFinite(n));
      const data: {
        cabinet_name: string;
        cabinet_type: string;
        stock_id?: number;
        machine_ip?: string | null;
        department_id?: number;
        temp_min: number | null;
        temp_max: number | null;
        hum_min: number | null;
        hum_max: number | null;
      } = {
        cabinet_name: values.cabinet_name.trim(),
        cabinet_type: values.cabinet_type,
        temp_min: climatePayload(values.temp_min),
        temp_max: climatePayload(values.temp_max),
        hum_min: climatePayload(values.hum_min),
        hum_max: climatePayload(values.hum_max),
      };
      if (divisionIds[0]) data.department_id = divisionIds[0];
      if (values.cabinet_type !== 'NARCOTIC') {
        const stockId = stockIdFromMachineIp(values.machine_ip);
        if (stockId != null) data.stock_id = stockId;
      }
      if (values.machine_ip?.trim()) data.machine_ip = values.machine_ip.trim();

      const response = await cabinetApi.create(data);

      if (response.success) {
        const cabinetId = Number((response.data as { id?: number } | undefined)?.id);
        if (cabinetId && divisionIds.length > 1) {
          for (const department_id of divisionIds.slice(1)) {
            await cabinetDepartmentApi.create({
              cabinet_id: cabinetId,
              department_id,
              status: 'ACTIVE',
            });
          }
        }
        toast.success(
          divisionIds.length > 0 ? 'เพิ่มตู้และเชื่อมโยง แผนก แล้ว' : 'เพิ่มตู้เรียบร้อยแล้ว',
        );
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถเพิ่มตู้ได้');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มตู้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>เพิ่มตู้ใหม่</span>
          </DialogTitle>
          <DialogDescription>รหัสตู้จะสร้างอัตโนมัติจากระบบ</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  <p className="text-xs text-muted-foreground">{machineIpHint(field.value, null, cabinetType)}</p>
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
