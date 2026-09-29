import { useState, useEffect } from 'react';
import { cabinetApi } from '@/lib/api';
import { fetchStaffDepartmentsForFilter } from '@/lib/staffDepartmentScope';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { climateFormError, climatePayload } from '@/app/admin/management/cabinets/components/cabinetTypes';

const fieldInputClass = 'bg-white';

interface CreateCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateCabinetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCabinetDialogProps) {
  const [loading, setLoading] = useState(false);
  type Dept = { ID: number; DepName?: string; RefDepID?: string };
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [formData, setFormData] = useState({
    cabinet_name: '',
    department_id: '',
    stock_id: '',
    temp_min: '',
    temp_max: '',
    hum_min: '',
    hum_max: '',
  });

  useEffect(() => {
    if (open) {
      fetchStaffDepartmentsForFilter({ limit: 500 })
        .then((list) => setDepartments(list as Dept[]))
        .catch(() => setDepartments([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFormData({
        cabinet_name: '',
        department_id: '',
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
    
    const climateError = climateFormError(formData);
    if (climateError) {
      toast.error(climateError);
      return;
    }

    try {
      setLoading(true);
      const data: any = {
        cabinet_name: formData.cabinet_name || undefined,
        temp_min: climatePayload(formData.temp_min),
        temp_max: climatePayload(formData.temp_max),
        hum_min: climatePayload(formData.hum_min),
        hum_max: climatePayload(formData.hum_max),
      };
      if (formData.department_id) {
        data.department_id = parseInt(formData.department_id);
      }
      if (formData.stock_id.trim()) {
        const sid = parseInt(formData.stock_id, 10);
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มตู้');
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
          <DialogDescription>
            รหัสตู้จะสร้างอัตโนมัติ เช่น VTN-ER-001 (ขึ้นต้น VTN + RefDepID ของแผนก + เลขลำดับ)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cabinet_name">ชื่อตู้</Label>
            <Input
              id="cabinet_name"
              placeholder="เช่น ตู้ A1, ตู้ห้องผ่าตัด"
              value={formData.cabinet_name}
              onChange={(e) => setFormData({ ...formData, cabinet_name: e.target.value })}
              className={fieldInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>แผนก</Label>
            <Select
              value={formData.department_id}
              onValueChange={(v) => setFormData({ ...formData, department_id: v })}
            >
              <SelectTrigger className={cn('w-full', fieldInputClass)}>
                <SelectValue placeholder="เลือกแผนก (เช่น ER → รหัส VTN-ER-001)" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.ID} value={String(d.ID)}>
                    {d.DepName || `ID ${d.ID}`}
                    {d.RefDepID ? ` (${d.RefDepID})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              เลือกแผนก ER จะได้รหัส VTN-ER-001, VTN-ER-002 ฯลฯ
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_id">Stock ID</Label>
            <Input
              id="stock_id"
              type="number"
              placeholder="กรอก Stock ID (ตัวเลข)"
              value={formData.stock_id}
              onChange={(e) => setFormData({ ...formData, stock_id: e.target.value })}
              className={fieldInputClass}
            />
            <p className="text-xs text-muted-foreground">
              ไม่กรอกระบบจะสร้างให้อัตโนมัติ
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="staff-mgmt-create-temp-min">อุณหภูมิต่ำสุด (°C)</Label>
              <Input
                id="staff-mgmt-create-temp-min"
                type="number"
                step="0.01"
                placeholder="เช่น 2"
                value={formData.temp_min}
                onChange={(e) => setFormData({ ...formData, temp_min: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-mgmt-create-temp-max">อุณหภูมิสูงสุด (°C)</Label>
              <Input
                id="staff-mgmt-create-temp-max"
                type="number"
                step="0.01"
                placeholder="เช่น 8"
                value={formData.temp_max}
                onChange={(e) => setFormData({ ...formData, temp_max: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-mgmt-create-hum-min">ความชื้นต่ำสุด (%)</Label>
              <Input
                id="staff-mgmt-create-hum-min"
                type="number"
                step="0.01"
                placeholder="เช่น 30"
                value={formData.hum_min}
                onChange={(e) => setFormData({ ...formData, hum_min: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-mgmt-create-hum-max">ความชื้นสูงสุด (%)</Label>
              <Input
                id="staff-mgmt-create-hum-max"
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
              {loading ? 'กำลังเพิ่ม...' : 'เพิ่มตู้'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
