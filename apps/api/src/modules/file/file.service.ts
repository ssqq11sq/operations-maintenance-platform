import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Client as MinioClient } from 'minio';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService implements OnModuleInit {
  private driver: 'local' | 'minio' = 'local';
  private minio?: MinioClient;
  private bucket = 'omp-files';
  private localDir = './uploads';
  private publicBase = 'http://localhost:3000';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.driver = (this.config.get('STORAGE_DRIVER') as 'local' | 'minio') || 'local';
    this.localDir = this.config.get('LOCAL_UPLOAD_DIR', './uploads');
    this.publicBase = this.config.get('PUBLIC_BASE_URL', '') || '';
    this.bucket = this.config.get('MINIO_BUCKET', 'omp-files');

    if (this.driver === 'minio') {
      this.minio = new MinioClient({
        endPoint: this.config.get('MINIO_ENDPOINT', '127.0.0.1'),
        port: Number(this.config.get('MINIO_PORT', 9000)),
        useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
        accessKey: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: this.config.get('MINIO_SECRET_KEY', 'minioadmin'),
      });
      const exists = await this.minio.bucketExists(this.bucket).catch(() => false);
      if (!exists) {
        await this.minio.makeBucket(this.bucket, '');
      }
    } else {
      await mkdir(this.localDir, { recursive: true });
    }
  }

  buildObjectKey(teamId: number, userId: number, filename: string) {
    const date = dayjs().format('YYYY-MM-DD');
    const base = (filename || 'file').split(/[\\/]/).pop() || 'file';
    const rawExt = base.includes('.') ? base.split('.').pop() : '';
    const ext = (rawExt || 'bin').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
    return `${teamId}/${userId}/${date}/${uuidv4()}.${ext}`;
  }

  async saveUpload(
    teamId: number,
    userId: number,
    file: Express.Multer.File,
  ) {
    const key = this.buildObjectKey(teamId, userId, file.originalname || 'photo.jpg');

    if (this.driver === 'minio' && this.minio) {
      await this.minio.putObject(this.bucket, key, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
      const endpoint = this.config.get('MINIO_ENDPOINT', '127.0.0.1');
      const port = this.config.get('MINIO_PORT', '9000');
      const useSSL = this.config.get('MINIO_USE_SSL', 'false') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      return {
        key,
        url: `${protocol}://${endpoint}:${port}/${this.bucket}/${key}`,
      };
    }

    const fullPath = join(this.localDir, key);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, file.buffer);
    // 相对路径：H5/Web 走同源代理，避免手机访问 localhost / HTTPS 混合内容拦截
    const relative = `/uploads/${key}`;
    const absoluteBase = (this.publicBase || '').replace(/\/$/, '');
    return {
      key,
      url: absoluteBase ? `${absoluteBase}${relative}` : relative,
      path: relative,
    };
  }
}
