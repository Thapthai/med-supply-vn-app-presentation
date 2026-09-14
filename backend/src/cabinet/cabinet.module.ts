import { Module } from '@nestjs/common';
import { CabinetUsersController } from './cabinet-users.controller';
import { CabinetUsersService } from './cabinet-users.service';
import { CabinetTempHumController } from './cabinet-temp-hum.controller';
import { CabinetTempHumService } from './cabinet-temp-hum.service';
import { StaffModule } from '../staff/staff.module';

/** โมดูลตู้ — ผู้ใช้ในตู้ + log อุณหภูมิ/ความชื้น; CRUD ตู้หลักยังอยู่ department */
@Module({
  imports: [StaffModule],
  controllers: [CabinetUsersController, CabinetTempHumController],
  providers: [CabinetUsersService, CabinetTempHumService],
  exports: [CabinetTempHumService],
})
export class CabinetModule {}
