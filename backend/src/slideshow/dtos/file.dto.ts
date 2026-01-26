import { IsString, IsNotEmpty } from 'class-validator';

export class FileDto {
  @IsString()
  @IsNotEmpty()
  file: string;
}

