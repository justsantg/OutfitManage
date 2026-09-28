import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, detectMimeTypeFromBuffer } from './storage.service';

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

// Firmas binarias mínimas (magic numbers) de cada formato, rellenadas hasta 32 bytes.
const pad = (bytes: number[] | Buffer) =>
  Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]).subarray(0, 32);
const ftyp = (brand: string) =>
  pad(
    Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from(`ftyp${brand}`)]),
  );

const SAMPLES = {
  jpeg: pad([0xff, 0xd8, 0xff, 0xe0]),
  png: pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  gif: pad(Buffer.from('GIF89a')),
  webp: pad(
    Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4),
      Buffer.from('WEBPVP8 '),
    ]),
  ),
  mp4: ftyp('isom'),
  mov: ftyp('qt  '),
  webm: pad(
    Buffer.concat([
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]),
      Buffer.from('webm'),
    ]),
  ),
  exe: pad([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
  script: pad(Buffer.from('<script>alert(1)</script>')),
};

function makeFile(
  overrides: Partial<{
    mimetype: string;
    originalname: string;
    buffer: Buffer;
  }> = {},
) {
  return {
    originalname: overrides.originalname ?? 'foto.jpg',
    mimetype: overrides.mimetype ?? 'image/jpeg',
    size: 1024,
    buffer: overrides.buffer ?? SAMPLES.jpeg,
  };
}

describe('detectMimeTypeFromBuffer', () => {
  it.each([
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['gif', 'image/gif'],
    ['webp', 'image/webp'],
    ['mp4', 'video/mp4'],
    ['mov', 'video/quicktime'],
    ['webm', 'video/webm'],
  ] as const)('reconoce la firma de %s', (sample, mime) => {
    expect(detectMimeTypeFromBuffer(SAMPLES[sample])).toBe(mime);
  });

  it.each([
    ['ejecutable PE (MZ)', SAMPLES.exe],
    ['script de texto', SAMPLES.script],
    ['audio M4A (ftyp no permitido)', ftyp('M4A ')],
    [
      'Matroska .mkv (EBML sin DocType webm)',
      pad([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x88]).fill(0x6d, 7, 15),
    ],
    ['buffer demasiado corto', Buffer.from([0xff, 0xd8, 0xff])],
    ['buffer vacío', Buffer.alloc(0)],
  ])('devuelve null para %s', (_label, buffer) => {
    expect(detectMimeTypeFromBuffer(buffer)).toBeNull();
  });
});

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

  describe('uploadFile — validación por contenido real (magic numbers)', () => {
    it('rechaza un ejecutable aunque el cliente declare image/jpeg y extensión .jpg', async () => {
      await expect(
        service.uploadFile(
          makeFile({
            buffer: SAMPLES.exe,
            mimetype: 'image/jpeg',
            originalname: 'foto.jpg',
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('rechaza un script camuflado como video/mp4', async () => {
      await expect(
        service.uploadFile(
          makeFile({ buffer: SAMPLES.script, mimetype: 'video/mp4' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('usa el MIME real (no el declarado) para contentType, extensión y bucket', async () => {
      await service.uploadFile(
        makeFile({
          buffer: SAMPLES.png,
          mimetype: 'application/octet-stream',
          originalname: 'foto.jpg.exe',
        }),
      );

      const [path, , options] = uploadMock.mock.calls[0];
      expect(path).toMatch(/\.png$/);
      expect(options.contentType).toBe('image/png');
    });

    it('envía un video real al bucket de videos aunque el cliente declare imagen', async () => {
      const result = await service.uploadFile(
        makeFile({ buffer: SAMPLES.mp4, mimetype: 'image/jpeg' }),
      );

      expect(result.tipo).toBe('VIDEO');
      expect(result.bucket).toBe('products_videos');
      const [path, , options] = uploadMock.mock.calls[0];
      expect(path).toMatch(/\.mp4$/);
      expect(options.contentType).toBe('video/mp4');
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
