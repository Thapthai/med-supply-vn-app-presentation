import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NarcoticController } from './narcotic.controller';
import { NarcoticService } from './narcotic.service';

@Module({
  imports: [AuthModule],
  controllers: [NarcoticController],
  providers: [NarcoticService],
  exports: [NarcoticService],
})
export class NarcoticModule {}
