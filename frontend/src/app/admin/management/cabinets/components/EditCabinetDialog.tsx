import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cabinetApi } from '@/lib/api';
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
import { CABINET_TYPE_OPTIONS, normalizeCabinetType } from './cabinetTypes';

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
  cabinet_status?: string;
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

  const form = useForm<CabinetEditFormData>({
    resolver: zodResolver(cabinetEditFormSchema),
    defaultValues: {
      cabinet_name: '',
      stock_id: '',
      cabinet_type: 'WEIGHING',
      cabinet_status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (open && cabinet) {
      form.reset({
        cabinet_name: cabinet.cabinet_name || '',
        stock_id: cabinet.stock_id != null ? String(cabinet.stock_id) : '',
        cabinet_type: normalizeCabinetType(cabinet.cabinet_type) || 'WEIGHING',
        cabinet_status: cabinetStatusToFormValue(cabinet.cabinet_status),
      });
    }
    if (!open) {
      form.reset({ cabinet_name: '', stock_id: '', cabinet_type: 'WEIGHING', cabinet_status: 'ACTIVE' });
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
        cabinet_status: string;
      } = {
        cabinet_name: values.cabinet_name.trim(),
        cabinet_type: values.cabinet_type,
        cabinet_status: resolveCabinetStatusForSave(values.cabinet_status, cabinet.cabinet_status),
      };
      if (values.stock_id?.trim()) {
        const sid = parseInt(values.stock_id.trim(), 10);
        if (!Number.isNaN(sid)) data.stock_id = sid;
      }

      const response = await cabinetApi.update(cabinet.id, data);

      if (response.success) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>แก้ไขตู้ Cabinet</span>
          </DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลตู้ (รหัสตู้และ Stock ID สร้างอัตโนมัติจากระบบ)
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

            <FormField
              control={form.control}
              name="stock_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock ID</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="กรอก Stock ID"
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
