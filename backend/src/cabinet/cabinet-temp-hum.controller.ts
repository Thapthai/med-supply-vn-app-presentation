import { Controller, Get, Query } from '@nestjs/common';
import { CabinetTempHumService } from './cabinet-temp-hum.service';
import { GetCabinetTempHumChartQueryDto } from './dto/get-cabinet-temp-hum-chart.dto';

@Controller('cabinet/temp-hum-logs')
export class CabinetTempHumController {
  constructor(private readonly cabinetTempHumService: CabinetTempHumService) {}

  /** ตารางตู้ + ค่าล่าสุดตามเดือน */
  @Get('overview')
  async getOverview(@Query() query: GetCabinetTempHumChartQueryDto) {
    try {
      const data = await this.cabinetTempHumService.getOverview({
        year: query.year,
        month: query.month,
      });
      return { success: true, data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message };
    }
  }

  /** กราฟอุณหภูมิ/ความชื้นของตู้ที่เลือก */
  @Get('chart')
  async getChart(@Query() query: GetCabinetTempHumChartQueryDto) {
    try {
      const data = await this.cabinetTempHumService.getChart({
        cabinet_id: query.cabinet_id,
        hours: query.hours,
        year: query.year,
        month: query.month,
        limit: query.limit,
      });
      return { success: true, data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message };
    }
  }
}
