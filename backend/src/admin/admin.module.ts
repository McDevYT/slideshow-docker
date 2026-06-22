import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FilesModule } from '../files/files.module';

@Module({
    imports: [FilesModule],
    controllers: [AdminController],
})
export class AdminModule {}
