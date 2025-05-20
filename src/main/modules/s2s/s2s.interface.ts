import Redis from 'ioredis';

export interface S2SConfig {
  microservice: string;
  url: string;
  key: string;
  ttl: number;
  secret: string;
  redisClient: Redis;
}
