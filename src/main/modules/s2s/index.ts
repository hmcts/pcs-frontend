import config from 'config';
import { Express } from 'express';
import { Redis } from 'ioredis';
import * as jose from 'jose';
import { TOTP } from 'totp-generator';

import { http } from '../http';

import { type S2SConfig } from './s2s.interface';

import { Logger } from '@modules/logger';

export class S2S {
  logger = Logger.getLogger('s2s');
  private serviceConfig: S2SConfig | null = null;
  private subscriber: Redis | null = null;

  private async publishTokenUpdate(redisClient: Redis, token: string): Promise<void> {
    try {
      const decodedToken = jose.decodeJwt(token);
      await redisClient.publish(
        's2s-token-update',
        JSON.stringify({
          token,
          expiry: decodedToken.exp,
        })
      );
    } catch (error) {
      this.logger.error('Failed to publish token update:', error);
      throw error;
    }
  }

  private setupRedisSubscription(redisClient: Redis): void {
    this.subscriber = redisClient.duplicate();
    this.subscriber.subscribe('s2s-token-update', err => {
      if (err) {
        this.logger.error('Failed to subscribe to s2s-token-update channel:', err);
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 's2s-token-update') {
        try {
          const { token, expiry } = JSON.parse(message);
          if (!token || !expiry) {
            this.logger.error('Invalid token update message received:', message);
            return;
          }
          http.setToken(token, expiry);
        } catch (error) {
          this.logger.error('Failed to parse token update message:', error);
        }
      }
    });
  }

  private async getServiceToken(serviceConfig: S2SConfig): Promise<string | null> {
    try {
      // Try to get token from Redis first
      let serviceToken: string | null = await serviceConfig.redisClient.get(serviceConfig.key);

      if (!serviceToken) {
        const { otp } = TOTP.generate(serviceConfig.secret);

        const params = {
          microservice: serviceConfig.microservice,
          oneTimePassword: otp,
        };

        const response = await fetch(`${serviceConfig.url}/lease`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const text = await response.text();
          this.logger.error('FETCH ERR: ', response.status, text);
          throw new Error(text);
        }

        serviceToken = await response.text();

        // Store token in Redis with expiry
        await serviceConfig.redisClient.set(serviceConfig.key, serviceToken, 'EX', serviceConfig.ttl);
        // Publish token update to all instances
        await this.publishTokenUpdate(serviceConfig.redisClient, serviceToken);
      }

      return serviceToken;
    } catch (error) {
      this.logger.error('Error getting service token:', error);
      return null;
    }
  }

  async regenerateToken(): Promise<void> {
    if (!this.serviceConfig) {
      this.logger.error('S2S not initialized');
      throw new Error('S2S not initialized');
    }

    // Get new token first
    const serviceToken = await this.getServiceToken(this.serviceConfig);
    if (!serviceToken) {
      throw new Error('Failed to get new S2S token');
    }

    // Only delete old token after we have a new one
    await this.serviceConfig.redisClient.del(this.serviceConfig.key);
  }

  async enableFor(app: Express): Promise<void> {
    const s2sSecret = config.get<string>('secrets.pcs.pcs-frontend-s2s-secret');
    const s2sConfig = config.get<S2SConfig>('s2s');
    const redisClient = app.locals.redisClient;

    // Store config for token regeneration
    this.serviceConfig = {
      ...s2sConfig,
      secret: s2sSecret,
      redisClient,
    };

    // Store S2S instance in app.locals for cleanup
    app.locals.s2s = this;

    // Setup Redis subscription for token updates
    this.setupRedisSubscription(redisClient);

    // Get initial token
    const serviceToken = await this.getServiceToken(this.serviceConfig);

    if (!serviceToken) {
      this.logger.error('Failed to initialize S2S token');
      throw new Error('Failed to initialize S2S token');
    }

    // Store token in Redis for other instances
    await redisClient.set(s2sConfig.key, serviceToken, 'EX', s2sConfig.ttl);

    // Set token in HTTP service
    const decodedToken = jose.decodeJwt(serviceToken);
    http.setToken(serviceToken, decodedToken.exp as number);

    // Set up token regenerator in HTTP service
    http.setTokenRegenerator(() => this.regenerateToken());
  }

  async cleanup(): Promise<void> {
    if (this.subscriber) {
      try {
        await this.subscriber.unsubscribe('s2s-token-update');
        await this.subscriber.quit();
        this.subscriber = null;
        this.logger.info('S2S Redis subscriber cleaned up successfully');
      } catch (error) {
        this.logger.error('Error cleaning up S2S Redis subscriber:', error);
      }
    }
  }
}
