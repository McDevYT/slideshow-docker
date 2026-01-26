import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    Param,
    Res,
    Get,
    Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller()
export class FilesController {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly filesService: FilesService,
    ) { }

    @Post('upload')
    @UseInterceptors( 
        FileInterceptor('file', new FilesService().getMulterOptions()),
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return this.filesService.processFile(file);
    }

    @Get('file/:filename')
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.filesService.getFilePath(filename);
        return res.sendFile(filePath);
    }

    @Delete('file/:filename')
    deleteFile(@Param('filename') filename: string) {
        this.filesService.deleteFile(filename);
        this.eventEmitter.emit('file.deleted', filename);
        return { message: `${filename} deleted successfully` };
    }

    @Get('files')
    getAllFiles(){
        return this.filesService.getAllFiles();
    }
}
