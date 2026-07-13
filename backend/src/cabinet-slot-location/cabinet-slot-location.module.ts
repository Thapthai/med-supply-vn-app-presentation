import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CabinetSlotLocationController } from './cabinet-slot-location.controller';
import { CabinetSlotLocationService } from './cabinet-slot-location.service';

@Module({
  imports: [AuthModule],
  controllers: [CabinetSlotLocationController],
  providers: [CabinetSlotLocationService],
  exports: [CabinetSlotLocationService],
})
export class CabinetSlotLocationModule {}
