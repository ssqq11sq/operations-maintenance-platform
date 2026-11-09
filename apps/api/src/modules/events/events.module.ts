import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { UserModule } from '../user/user.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [
    UserModule,
    TeamModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'omp-dev-jwt-secret-change-me'),
      }),
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
