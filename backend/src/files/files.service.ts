import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { existsSync, mkdirSync, readdirSync, unlinkSync, renameSync, copyFileSync } from 'fs';
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import sharp from 'sharp';
import {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    UPLOADS_DIR,
    DELETED_UPLOADS_DIR,
} from 'src/scripts/consts';

@Injectable()
export class FilesService {
    ensureUploadsDirExists() {
        if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
        if (!existsSync(DELETED_UPLOADS_DIR)) mkdirSync(DELETED_UPLOADS_DIR, { recursive: true });
    }

    fileExists(filename: string): boolean {
        return existsSync(join(UPLOADS_DIR, filename));
    }

    generateFileName(originalName: string): string {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `${uniqueName}${extname(originalName)}`;
    }

    getMulterOptions(): MulterOptions {
        this.ensureUploadsDirExists();

        return {
            storage: diskStorage({
                destination: UPLOADS_DIR,
                filename: (_req, file, callback) => {
                    callback(null, this.generateFileName(file.originalname));
                },
            }),
            limits: { fileSize: MAX_FILE_SIZE },
            fileFilter: (_req, file, callback) => {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    return callback(new BadRequestException('Invalid file type'), false);
                }
                callback(null, true);
            },
        };
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

    async processFile(file: Express.Multer.File): Promise<{
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
    }> {
        this.validateFile(file);

        const isImage =
            file.mimetype.startsWith('image/') && file.mimetype !== 'image/gif';
        let finalFilename = file.filename;

        if (isImage) {
            const webpFilename = file.filename.replace(
                extname(file.filename),
                '.webp',
            );
            const outputPath = join(UPLOADS_DIR, webpFilename);
            const tempOutputPath = join(UPLOADS_DIR, `temp-${webpFilename}`);

            try {
                await sharp(file.path).webp({ quality: 80 }).toFile(tempOutputPath);
            } catch (error) {
                await unlink(file.path);
                throw new BadRequestException('Invalid image file');
            }
            await unlink(file.path);
            renameSync(tempOutputPath, outputPath);
            finalFilename = webpFilename;
        }

        return {
            filename: finalFilename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
        };
    }

    async convertToWebp(
        filePath: string,
        originalFilename: string,
        mimeType: string, // Pass mimetype to check
    ): Promise<string> {
        const isImage = mimeType.startsWith('image/') && mimeType !== 'image/gif';

        if (!isImage) {
            return originalFilename;
        }

        const webpFilename = originalFilename.replace(
            extname(originalFilename),
            '.webp',
        );
        const outputPath = join(UPLOADS_DIR, webpFilename);
        const tempOutputPath = join(UPLOADS_DIR, `temp-${webpFilename}`);
        try {
            await sharp(filePath).webp({ quality: 80 }).toFile(tempOutputPath);
        } catch (error) {
            await unlink(filePath);
            throw new BadRequestException('Invalid image file');
        }
        await unlink(filePath);
        renameSync(tempOutputPath, outputPath);
        return webpFilename;
    }

    getFilePath(filename: string): string {
        const filePath = join(UPLOADS_DIR, filename);
        if (!existsSync(filePath)) throw new NotFoundException('File not found');
        return filePath;
    }

    getAllFiles(): string[] {
        try {
            return readdirSync(UPLOADS_DIR);
        } catch {
            return [];
        }
    }

    deleteFile(filename: string) {
        const filePath = join(UPLOADS_DIR, filename);
        if (!existsSync(filePath)) throw new NotFoundException('File not found');
        this.ensureUploadsDirExists();
        const deletedFilePath = join(DELETED_UPLOADS_DIR, filename);
        try {
            renameSync(filePath, deletedFilePath);
        } catch (error: any) {
            if (error.code === 'EXDEV') {
                copyFileSync(filePath, deletedFilePath);
                unlinkSync(filePath);
            } else {
                throw new BadRequestException('Could not delete file');
            }
        }
    }

    getDeletedFilePath(filename: string): string {
        const filePath = join(DELETED_UPLOADS_DIR, filename);
        if (!existsSync(filePath)) throw new NotFoundException('File not found');
        return filePath;
    }

    getAllDeletedFiles(): string[] {
        try {
            return readdirSync(DELETED_UPLOADS_DIR);
        } catch {
            return [];
        }
    }

    permanentlyDeleteFile(filename: string) {
        const filePath = join(DELETED_UPLOADS_DIR, filename);
        try {
            unlinkSync(filePath);
        } catch {
            throw new NotFoundException('File not found');
        }
    }

    restoreFile(filename: string) {
        const deletedPath = join(DELETED_UPLOADS_DIR, filename);
        const restoredPath = join(UPLOADS_DIR, filename);
        if (!existsSync(deletedPath)) throw new NotFoundException('File not found');
        try {
            renameSync(deletedPath, restoredPath);
        } catch (error: any) {
            if (error.code === 'EXDEV') {
                copyFileSync(deletedPath, restoredPath);
                unlinkSync(deletedPath);
            } else {
                throw new BadRequestException('Could not restore file');
            }
        }
    }
}
