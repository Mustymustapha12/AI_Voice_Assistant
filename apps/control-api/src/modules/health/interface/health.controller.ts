import type { HealthResponse } from '@avc/contracts';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ReadinessService } from '../application/readiness.service.js';

@ApiTags('health')
@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  public constructor(private readonly readinessService: ReadinessService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  @ApiOkResponse({ description: 'The process is alive.' })
  public liveness(): HealthResponse {
    return this.readinessService.liveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Dependency readiness probe' })
  @ApiOkResponse({ description: 'All required dependencies are available.' })
  @ApiServiceUnavailableResponse({ description: 'One or more dependencies are unavailable.' })
  public async readiness(): Promise<HealthResponse> {
    const response = await this.readinessService.readiness();
    if (response.status === 'error') {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }
}
