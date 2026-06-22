import {
    Controller,
    Get,
    Param,
    Res,
    Delete,
    Post,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from '../files/files.service';
import { BasicAuthGuard } from './basic-auth.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('admin')
@UseGuards(BasicAuthGuard)
export class AdminController {
    constructor(
        private readonly filesService: FilesService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    @Get('deleted-files')
    getDeletedFiles() {
        return this.filesService.getAllDeletedFiles();
    }

    @Get('deleted-file/:filename')
    getDeletedFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.filesService.getDeletedFilePath(filename);
        return res.sendFile(filePath);
    }

    @Get('download/:filename')
    downloadFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.filesService.getDeletedFilePath(filename);
        return res.download(filePath);
    }

    @Delete('deleted-file/:filename')
    permanentlyDeleteFile(@Param('filename') filename: string) {
        this.filesService.permanentlyDeleteFile(filename);
        return { message: `${filename} permanently deleted` };
    }

    @Post('restore-file/:filename')
    restoreFile(@Param('filename') filename: string) {
        this.filesService.restoreFile(filename);
        this.eventEmitter.emit('file.uploaded', { filename });
        return { message: `${filename} restored` };
    }
}
