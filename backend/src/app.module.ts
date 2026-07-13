import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth';
import { CategoryModule } from './category/category.module';
import { CabinetModule } from './cabinet/cabinet.module';
import { DepartmentModule } from './department/department.module';
import { ItemModule } from './item/item.module';
import { MedicalSuppliesModule } from './medical-supplies/medical-supplies.module';
import { ReportServiceModule } from './report/report-service.module';
import { EmailModule } from './email/email.module';
import { PrismaModule } from './prisma/prisma.module';
import { DateTimeModule } from './utils/date-time/date-time.module';
import { StaffModule } from './staff/staff.module';
import { WeighingModule } from './weighing/weighing.module';
import { StickerPrintModule } from './sticker-print/sticker-print.module';
import { EmpolyeeModule } from './empolyee/empolyee.module';
import { DepartmentDispenseModule } from './department-dispense/department-dispense.module';
import { CabinetSlotLocationModule } from './cabinet-slot-location/cabinet-slot-location.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    CategoryModule,
    CabinetModule,
    DepartmentModule,
    ItemModule,
    MedicalSuppliesModule,
    ReportServiceModule,
    DateTimeModule,
    StaffModule,
    WeighingModule,
    StickerPrintModule,
    EmpolyeeModule,
    DepartmentDispenseModule,
    CabinetSlotLocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
