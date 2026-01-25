import { Module } from '@nestjs/common';
import { FilesController } from './files/controller/files.controller';

@Module({
  imports: [],
  controllers: [FilesController],
  providers: [],
})
export class AppModule {}
