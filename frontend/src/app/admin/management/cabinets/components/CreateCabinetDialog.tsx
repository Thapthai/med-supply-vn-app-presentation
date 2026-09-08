import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cabinetApi } from '@/lib/api';
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
import { CABINET_TYPE_OPTIONS } from './cabinetTypes';

const fieldInputClass = 'bg-white';

interface CreateCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const defaultValues: CabinetFormData = {
  cabinet_name: '',
  stock_id: '',
  cabinet_type: 'WEIGHING',
};

export default function CreateCabinetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCabinetDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CabinetFormData>({
    resolver: zodResolver(cabinetFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
    }
  }, [open, form]);

  const handleSubmit = async (values: CabinetFormData) => {
    try {
      setLoading(true);
      const data: { cabinet_name: string; cabinet_type: string; stock_id?: number } = {
        cabinet_name: values.cabinet_name.trim(),
        cabinet_type: values.cabinet_type,
      };
      if (values.stock_id?.trim()) {
        const sid = parseInt(values.stock_id.trim(), 10);
        if (!Number.isNaN(sid)) data.stock_id = sid;
      }

      const response = await cabinetApi.create(data);

      if (response.success) {
        toast.success('เพิ่มตู้เรียบร้อยแล้ว');
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
      <DialogContent className="sm:max-w-lg">
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

            <FormField
              control={form.control}
              name="stock_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock ID</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="กรอก Stock ID (ตัวเลข)"
                      className={fieldInputClass}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    ไม่กรอกระบบจะสร้างให้อัตโนมัติ
                  </p>
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
