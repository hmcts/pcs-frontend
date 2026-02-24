import type { Request } from 'express';
import { type Redis } from 'ioredis';

// Mock logger to keep console clean
jest.mock('@modules/logger', () => ({
  Logger: { getLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })) },
}));

// Import after mocks
const { redisStore } = require('../../../../../../main/modules/journey/engine/storage/redisStore');

// Helper to create a fake Express request with injected redis client + session
const makeReq = (client?: Redis, uid = 'u1'): Request => {
  return {
    app: { locals: { redisClient: client } },
    session: { user: { uid } },
  } as unknown as Request;
};

describe('redisStore', () => {
  const slug = 'test-slug';
  const caseId = 'case-123';
  const store = redisStore(slug);

  it('falls back gracefully when no redis client present', async () => {
    const req = makeReq(undefined, 'anon');
    const { data, version } = await store.load(req, caseId);
    expect(data).toEqual({});
    expect(version).toBe(0);

    const saved = await store.save(req, caseId, 0, { step: { a: 1 } });
    expect(saved.data).toEqual({ step: { a: 1 } });
    expect(saved.version).toBe(1);
  });

  it('uses redis client to read/write and deep-merge data keyed by user', async () => {
    const getMock = jest.fn();
    const setMock = jest.fn();
    const client = { get: getMock, set: setMock } as unknown as Redis;

    // First call: no existing data -> get returns null
    getMock.mockResolvedValueOnce(null);

    const req = makeReq(client, 'userX');

    // Save some data – should write JSON with merged data & incremented version
    await store.save(req, caseId, 0, { step1: { foo: 'bar' } });

    const expectedKey = `${slug}:userX:${caseId}`;
    expect(setMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(setMock.mock.calls[0][1]);
    expect(setMock.mock.calls[0][0]).toBe(expectedKey);
    expect(payload.data).toEqual({ step1: { foo: 'bar' } });
    expect(payload.version).toBe(1);

    // Second load – simulate existing value coming back
    getMock.mockResolvedValueOnce(JSON.stringify(payload));
    const loaded = await store.load(req, caseId);
    expect(loaded).toEqual(payload);

    // Third save – deep-merge into existing nested object
    getMock.mockResolvedValueOnce(JSON.stringify(payload));
    await store.save(req, caseId, 1, { step1: { baz: 'qux' }, step2: 'val' });
    const secondSetPayload = JSON.parse(setMock.mock.calls[1][1]);
    expect(secondSetPayload.data).toEqual({ step1: { foo: 'bar', baz: 'qux' }, step2: 'val' });
    expect(secondSetPayload.version).toBe(2);
  });
});
