import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from './roles/roles.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { HistoryModule } from './history/history.module';
import { UsersModule } from './users/users.module';
import { ReminderModule } from './reminder/reminder.module';
import { MedicineModule } from './medicine/medicine.module';
import { ExtractionModule } from './extraction/extraction.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MedicineScannerModule } from './medicine-scanner/medicine-scanner.module';
import { ChatModule } from './chat/chat.module';
import config from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      load: [config],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        secret: config.get('jwt.secret'),
      }),
      global: true,
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        uri: config.get('database.connectionString'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    RolesModule,
    UsersModule,
    PrescriptionModule,
    MedicineModule,
    ReminderModule,
    HistoryModule,
    ExtractionModule,
    SchedulerModule,
    MedicineScannerModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
