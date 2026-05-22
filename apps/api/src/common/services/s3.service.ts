import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get<string>('app.aws.accessKeyId');
    const secretAccessKey = this.config.get<string>('app.aws.secretAccessKey');
    this.region = this.config.get<string>('app.aws.region') ?? 'us-east-1';
    this.bucket = this.config.get<string>('app.aws.s3Bucket') ?? 'superapp-hogar-dev';

    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.logger.warn('AWS credentials not configured — S3Service running in mock mode');
    }
  }

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    if (!this.client) {
      const mockUrl = `https://mock-s3.localhost/${this.bucket}/${key}`;
      this.logger.debug(`[MOCK] uploadFile → ${mockUrl}`);
      return mockUrl;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.client) {
      const mockUrl = `https://mock-s3.localhost/${this.bucket}/${key}?signed=true&expires=${expiresIn}`;
      this.logger.debug(`[MOCK] getSignedUrl → ${mockUrl}`);
      return mockUrl;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
