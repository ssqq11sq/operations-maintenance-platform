import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TeamModule } from './modules/team/team.module';
import { FileModule } from './modules/file/file.module';
import { PunchModule } from './modules/punch/punch.module';
import { WorkOrderModule } from './modules/work-order/work-order.module';
import { StatsModule } from './modules/stats/stats.module';
import { EventsModule } from './modules/events/events.module';
import { GeoModule } from './modules/geo/geo.module';
import { AuditModule } from './modules/audit/audit.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { FormTemplate } from './entities/form-template.entity';
import { WorkOrder } from './entities/work-order.entity';
import { PunchRecord } from './entities/punch-record.entity';
import { OperationLog } from './entities/operation-log.entity';
import { OvertimeRequest } from './entities/overtime-request.entity';
import { SeedService } from './seed.service';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

const entities = [
  User,
  Role,
  Team,
  TeamMember,
  FormTemplate,
  WorkOrder,
  PunchRecord,
  OperationLog,
  OvertimeRequest,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const dbType = config.get<string>('DB_TYPE', 'sqlite');
        const synchronize = config.get<string>('DB_SYNC', 'true') === 'true';

        if (dbType === 'mysql') {
          return {
            type: 'mysql',
            host: config.get<string>('DB_HOST', '127.0.0.1'),
            port: Number(config.get<string>('DB_PORT', '3306')),
            username: config.get<string>('DB_USER', 'omp'),
            password: config.get<string>('DB_PASSWORD', 'omp123'),
            database: config.get<string>('DB_NAME', 'omp'),
            entities,
            synchronize,
          };
        }

        return {
          type: 'sqljs',
          autoSave: true,
          location: config.get<string>('DB_DATABASE', './data/omp.sqlite'),
          entities,
          synchronize,
        };
      },
    }),
    TypeOrmModule.forFeature([User, Role, Team, TeamMember, FormTemplate]),
    AuthModule,
    UserModule,
    TeamModule,
    FileModule,
    EventsModule,
    PunchModule,
    WorkOrderModule,
    StatsModule,
    GeoModule,
    AuditModule,
    OvertimeModule,
  ],
  providers: [SeedService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
