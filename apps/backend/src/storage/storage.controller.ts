import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  StorageService,
  UploadResult,
  UploadedMulterFile,
} from './storage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Nota (RF-009 FA-02): Nest mapea el error LIMIT_FILE_SIZE de Multer a 413 PayloadTooLargeException
// de forma nativa, así que un archivo que excede el límite ya responde 413 sin filtro adicional.
@ApiTags('Storage & Media')
@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'BODEGA')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Subir una imagen o video a Supabase Storage y obtener su URL firmada',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max para videos/fotos
      },
    }),
  )
  async uploadSingle(
    @UploadedFile() file: UploadedMulterFile,
    @Body('folder') folder?: string,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException(
        'Debes enviar un archivo en el campo "file"',
      );
    }

    return this.storageService.uploadFile(file, folder);
  }

  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'BODEGA')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subir múltiples imágenes o videos simultáneamente',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async uploadMultiple(
    @UploadedFiles() files: UploadedMulterFile[],
    @Body('folder') folder?: string,
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un archivo en el campo "files"',
      );
    }

    const results: UploadResult[] = [];
    for (const file of files) {
      const res = await this.storageService.uploadFile(file, folder);
      results.push(res);
    }
    return results;
  }

  @Delete('file')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'BODEGA')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un archivo multimedia del storage' })
  async deleteFile(
    @Body('bucket') bucket: string,
    @Body('path') path: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!bucket || !path) {
      throw new BadRequestException('Debes especificar el bucket y el path');
    }

    const success = await this.storageService.deleteFile(bucket, path);
    return {
      success,
      message: success
        ? 'Archivo eliminado exitosamente de Supabase Storage'
        : 'No se pudo eliminar el archivo',
    };
  }
}
