import { Module } from '@nestjs/common';

import { ReadinessService } from './application/readiness.service.js';
import { HealthController } from './interface/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [ReadinessService],
})
export class HealthModule {}
