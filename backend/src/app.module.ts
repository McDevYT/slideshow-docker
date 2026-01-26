import { Module } from '@nestjs/common';
import { FilesModule } from './files/files.module';
import { SlideshowModule } from './slideshow/slideshow.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    imports: [EventEmitterModule.forRoot(), FilesModule, SlideshowModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
