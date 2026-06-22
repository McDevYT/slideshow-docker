import { Module } from '@nestjs/common';
import { FilesModule } from './files/files.module';
import { SlideshowModule } from './slideshow/slideshow.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminModule } from './admin/admin.module';

@Module({
    imports: [EventEmitterModule.forRoot(), FilesModule, SlideshowModule, AdminModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
