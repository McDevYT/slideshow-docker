import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import sharp from 'sharp';
import {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    UPLOADS_DIR,
} from 'src/scripts/consts';

@Injectable()
export class FilesService {
    ensureUploadsDirExists() {
        if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    generateFileName(originalName: string): string {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `${uniqueName}${extname(originalName)}`;
    }

    validateFile(file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException('File is too large');
        }
    }

    async convertToWebp(
        filePath: string,
        originalFilename: string,
    ): Promise<string> {
        const webpFilename = originalFilename.replace(
            extname(originalFilename),
            '.webp',
        );
        const outputPath = join(UPLOADS_DIR, webpFilename);
        await sharp(filePath).webp({ quality: 80 }).toFile(outputPath);
        await unlink(filePath);
        return webpFilename;
    }

    getFilePath(filename: string): string {
        const filePath = join(UPLOADS_DIR, filename);
        if (!existsSync(filePath)) throw new NotFoundException('File not found');
        return filePath;
    }
}
