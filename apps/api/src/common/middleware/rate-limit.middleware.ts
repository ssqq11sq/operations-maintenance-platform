import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

/**
 * 简易内存限流（单机开发够用；多实例请换 Redis）。
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private buckets = new Map<string, Bucket>();

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path || '';
    const needLimit =
      path.includes('/auth/login') ||
      path.includes('/auth/sms/send') ||
      path.includes('/auth/sms/login') ||
      path.includes('/auth/wechat/login');
    if (!needLimit) return next();

    const ip = String(
      req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '',
    );
    const key = `${ip}:${path}`;
    const now = Date.now();
    const windowMs = 60_000;
    const max = path.includes('sms/send') ? 8 : 30;
    let bucket = this.buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.status(429).json({ message: '请求过于频繁，请稍后再试', statusCode: 429 });
      return;
    }
    next();
  }
}
