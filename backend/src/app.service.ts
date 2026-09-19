import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'Vaucher Backend API is running',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
