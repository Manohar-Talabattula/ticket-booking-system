import { RedisOptions } from 'ioredis';

export function getRedisConnection(): any {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: Number(url.port),
    password: url.password,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}