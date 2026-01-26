import { join } from "path";

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 
  'image/bmp', 'image/svg+xml', 'image/x-icon', 'image/jfif', 
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 
  'video/x-ms-wmv', 'video/webm'
];
