import { useState, useEffect } from 'react';
import { cabinetApi } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Edit } from 'lucide-react';
import { climateFormError, climateInputValue, climatePayload } from '@/app/admin/management/cabinets/components/cabinetTypes';

const fieldInputClass = 'bg-white';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
  temp_min?: number | string | null;
  temp_max?: number | string | null;
  hum_min?: number | string | null;
  hum_max?: number | string | null;
}

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
  const [formData, setFormData] = useState({
    cabinet_name: '',
    cabinet_code: '',
    stock_id: '',
    temp_min: '',
    temp_max: '',
    hum_min: '',
    hum_max: '',
  });

  // Load cabinet data when dialog opens
  useEffect(() => {
    if (open && cabinet) {
      setFormData({
        cabinet_name: cabinet.cabinet_name || '',
        cabinet_code: cabinet.cabinet_code || '',
        stock_id: cabinet.stock_id?.toString() || '',
        temp_min: climateInputValue(cabinet.temp_min),
        temp_max: climateInputValue(cabinet.temp_max),
        hum_min: climateInputValue(cabinet.hum_min),
        hum_max: climateInputValue(cabinet.hum_max),
      });
    }
  }, [open, cabinet]);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      setFormData({
        cabinet_name: '',
        cabinet_code: '',
        stock_id: '',
        temp_min: '',
        temp_max: '',
        hum_min: '',
        hum_max: '',
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabinet) return;

    const climateError = climateFormError(formData);
    if (climateError) {
      toast.error(climateError);
      return;
    }

    try {
      setLoading(true);
      const data: {
        cabinet_name?: string;
        cabinet_code?: string;
        stock_id?: number;
        temp_min: number | null;
        temp_max: number | null;
        hum_min: number | null;
        hum_max: number | null;
      } = {
        cabinet_name: formData.cabinet_name || undefined,
        cabinet_code: formData.cabinet_code || undefined,
        temp_min: climatePayload(formData.temp_min),
        temp_max: climatePayload(formData.temp_max),
        hum_min: climatePayload(formData.hum_min),
        hum_max: climatePayload(formData.hum_max),
      };
      if (formData.stock_id.trim()) {
        const sid = parseInt(formData.stock_id, 10);
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
            แก้ไขข้อมูลตู้ Cabinet: {cabinet.cabinet_name || cabinet.cabinet_code || `ID: ${cabinet.id}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cabinet_name">ชื่อตู้ Cabinet</Label>
            <Input
              id="cabinet_name"
              placeholder="เช่น ตู้ A1, ตู้ห้องผ่าตัด"
              value={formData.cabinet_name}
              onChange={(e) => setFormData({ ...formData, cabinet_name: e.target.value })}
              className={fieldInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cabinet_code">รหัสตู้ Cabinet</Label>
            <Input
              id="cabinet_code"
              placeholder="เช่น CAB001, CAB-A1"
              value={formData.cabinet_code}
              onChange={(e) => setFormData({ ...formData, cabinet_code: e.target.value })}
              className={fieldInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_id">Stock ID</Label>
            <Input
              id="stock_id"
              type="number"
              placeholder="กรอก Stock ID"
              value={formData.stock_id}
              onChange={(e) => setFormData({ ...formData, stock_id: e.target.value })}
              className={fieldInputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="staff-edit-temp-min">อุณหภูมิต่ำสุด (°C)</Label>
              <Input
                id="staff-edit-temp-min"
                type="number"
                step="0.01"
                placeholder="เช่น 2"
                value={formData.temp_min}
                onChange={(e) => setFormData({ ...formData, temp_min: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-edit-temp-max">อุณหภูมิสูงสุด (°C)</Label>
              <Input
                id="staff-edit-temp-max"
                type="number"
                step="0.01"
                placeholder="เช่น 8"
                value={formData.temp_max}
                onChange={(e) => setFormData({ ...formData, temp_max: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-edit-hum-min">ความชื้นต่ำสุด (%)</Label>
              <Input
                id="staff-edit-hum-min"
                type="number"
                step="0.01"
                placeholder="เช่น 30"
                value={formData.hum_min}
                onChange={(e) => setFormData({ ...formData, hum_min: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-edit-hum-max">ความชื้นสูงสุด (%)</Label>
              <Input
                id="staff-edit-hum-max"
                type="number"
                step="0.01"
                placeholder="เช่น 60"
                value={formData.hum_max}
                onChange={(e) => setFormData({ ...formData, hum_max: e.target.value })}
                className={fieldInputClass}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
