import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const uploadMock = jest
  .fn()
  .mockResolvedValue({ data: { path: 'productos/x.jpg' }, error: null });
const createSignedUrlMock = jest.fn().mockResolvedValue({
  data: { signedUrl: 'https://signed.example/x.jpg' },
  error: null,
});
const removeMock = jest.fn().mockResolvedValue({ error: null });
const getPublicUrlMock = jest
  .fn()
  .mockReturnValue({ data: { publicUrl: 'https://public.example/x.jpg' } });

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        createSignedUrl: createSignedUrlMock,
        remove: removeMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}));

const JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

function makeFile(
  overrides: Partial<{ mimetype: string; originalname: string; buffer: Buffer }> = {},
) {
  return {
    originalname: overrides.originalname ?? 'foto.jpg',
    mimetype: overrides.mimetype ?? 'image/jpeg',
    size: 1024,
    buffer: overrides.buffer ?? JPEG_BUFFER,
  };
}

describe('StorageService', () => {
  let service: StorageService;

  const config: Record<string, string> = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_KEY: 'service-role-key',
    SUPABASE_BUCKET_IMAGES: 'products_images',
    SUPABASE_BUCKET_VIDEOS: 'products_videos',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('uploadFile — validación de tipo MIME por magic numbers (SEC-07)', () => {
    it('rechaza un archivo con buffer no reconocido o fuera de la allowlist', async () => {
      await expect(
        service.uploadFile(
          makeFile({
            mimetype: 'application/x-msdownload',
            buffer: Buffer.from('MZ\x90\x00\x03\x00\x00\x00'),
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('rechaza un archivo malicioso renombrado aunque el cliente declare image/jpeg (anti-spoofing)', async () => {
      await expect(
        service.uploadFile(
          makeFile({
            originalname: 'script_malicioso.jpg',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('<?php echo "evil"; ?>'),
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('ignora la extensión del nombre de archivo del cliente y usa la derivada del MIME real', async () => {
      await service.uploadFile(
        makeFile({
          originalname: 'foto.jpg.exe',
          mimetype: 'image/png',
          buffer: PNG_BUFFER,
        }),
      );

      const [path] = uploadMock.mock.calls[0];
      expect(path).toMatch(/\.png$/);
    });

    it('nunca sube con upsert:true (no debe sobrescribir un objeto existente)', async () => {
      await service.uploadFile(makeFile());

      const [, , options] = uploadMock.mock.calls[0];
      expect(options.upsert).toBe(false);
    });

    it('sanitiza una carpeta con intento de path traversal', async () => {
      await service.uploadFile(makeFile(), '../../etc');

      const [path] = uploadMock.mock.calls[0];
      expect(path.startsWith('etc/')).toBe(true);
      expect(path).not.toContain('..');
    });
  });

  describe('deleteFile — allowlist de bucket', () => {
    it('rechaza un bucket que no es ninguno de los dos configurados', async () => {
      await expect(
        service.deleteFile('otro-bucket-cualquiera', 'foo.jpg'),
      ).rejects.toThrow(BadRequestException);
      expect(removeMock).not.toHaveBeenCalled();
    });

    it('permite borrar del bucket de imágenes configurado', async () => {
      const result = await service.deleteFile('products_images', 'foo.jpg');
      expect(result).toBe(true);
      expect(removeMock).toHaveBeenCalledWith(['foo.jpg']);
    });
  });
});
