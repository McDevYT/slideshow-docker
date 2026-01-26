import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
    Param,
    Res,
    NotFoundException,
    Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import sharp from 'sharp';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, UPLOADS_DIR } from 'src/scripts/consts';
import { FilesService } from '../services/files.service';

@Controller()
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: UPLOADS_DIR,
                filename: (_req, file, callback) => {
                    const filename = new FilesService().generateFileName(file.originalname);
                    callback(null, filename);
                },
            }),
            limits: { fileSize: MAX_FILE_SIZE },
            fileFilter: (_req, file, callback) => {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    return callback(new BadRequestException('Invalid file type'), false);
                }
                callback(null, true);
            },
        }),
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        this.filesService.ensureUploadsDirExists();
        this.filesService.validateFile(file);

        const webpFilename = await this.filesService.convertToWebp(file.path, file.filename);

        return {
            filename: webpFilename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
        };
    }

    @Get('file/:filename')
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.filesService.getFilePath(filename);
        return res.sendFile(filePath);
    }
}
