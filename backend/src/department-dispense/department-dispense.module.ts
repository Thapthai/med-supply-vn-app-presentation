import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DepartmentDispenseController } from './department-dispense.controller';
import { DepartmentDispenseService } from './department-dispense.service';
import { DepartmentDispenseExportExcelService } from './services/department-dispense-export-excel.service';
import { DepartmentDispenseExportPdfService } from './services/department-dispense-export-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentDispenseController],
  providers: [
    DepartmentDispenseService,
    DepartmentDispenseExportExcelService,
    DepartmentDispenseExportPdfService,
  ],
  exports: [DepartmentDispenseService],
})
export class DepartmentDispenseModule {}
