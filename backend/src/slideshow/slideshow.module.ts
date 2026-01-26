import { Module } from '@nestjs/common';
import { SlideshowService } from './slideshow.service';
import { SlideshowController } from './slideshow.controller';
import { FilesModule } from 'src/files/files.module';

@Module({
    imports: [FilesModule],
    controllers: [SlideshowController],
    providers: [SlideshowService],
    exports: [SlideshowService],
})
export class SlideshowModule { }
