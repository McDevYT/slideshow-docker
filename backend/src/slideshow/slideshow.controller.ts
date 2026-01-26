import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Post,
} from '@nestjs/common';
import { SlideshowService } from './slideshow.service';
import { FileDto } from './dtos/file.dto';
import { FilesService } from 'src/files/files.service';

@Controller('slideshow')
export class SlideshowController {
    constructor(
        private readonly slideshowService: SlideshowService,
        private readonly filesService: FilesService,
    ) { }

    @Get('next')
    getNext() {
        const file = this.slideshowService.getNext();
        if (!file) return { message: 'No files available' };
        return { file };
    }

    @Get('queue')
    getQueue() {
        return this.slideshowService.getQueue();
    }

    @Get('loop')
    getLoop() {
        return this.slideshowService.getLoop();
    }

    @Post('queue')
    addToQueue(@Body() dto: FileDto) {
        if (!this.filesService.fileExists(dto.file)) {
            throw new BadRequestException('File does not exist');
        }

        this.slideshowService.addToQueue(dto.file);
        return { message: `${dto.file} added to queue` };
    }

    @Post('loop')
    addToLoop(@Body() dto: FileDto) {
        if (!this.filesService.fileExists(dto.file)) {
            throw new BadRequestException('File does not exist');
        }

        this.slideshowService.addToLoop(dto.file);
        return { message: `${dto.file} added to loop` };
    }

    @Delete('loop')
    removeFromLoop(@Body() dto: FileDto) {
        if (!this.filesService.fileExists(dto.file)) {
            throw new BadRequestException('File does not exist');
        }

        this.slideshowService.removeFromLoop(dto.file);
        return { message: `${dto.file} removed from loop` };
    }

    @Delete('queue')
    removeFromQueue(@Body() dto: FileDto) {
        if (!this.filesService.fileExists(dto.file)) {
            throw new BadRequestException('File does not exist');
        }

        this.slideshowService.removeFromQueue(dto.file);
        return { message: `${dto.file} removed from queue` };
    }
}
