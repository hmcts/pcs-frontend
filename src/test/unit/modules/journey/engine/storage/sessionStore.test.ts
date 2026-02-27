import type { Request } from 'express';

// Silence logger
jest.mock('@modules/logger', () => ({
  Logger: { getLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })) },
}));

const { sessionStore } = require('../../../../../../main/modules/journey/engine/storage/sessionStore');

describe('sessionStore', () => {
  const slug = 'ss-slug';
  const caseId = 'case-1';
  const store = sessionStore(slug);

  const makeReq = (): Request => ({ session: {} }) as unknown as Request;

  it('returns empty data on first load', async () => {
    const req = makeReq();
    const result = await store.load(req, caseId);
    expect(result).toEqual({ data: {}, version: 0 });
  });

  it('persists and deep-merges objects between saves', async () => {
    const req = makeReq();
    await store.save(req, caseId, 0, { stepA: { foo: 'bar' } });
    await store.save(req, caseId, 1, { stepA: { baz: 'qux' }, stepB: 'val' });

    const { data, version } = await store.load(req, caseId);
    expect(version).toBe(0); // sessionStore keeps version unchanged
    expect(data).toEqual({ stepA: { foo: 'bar', baz: 'qux' }, stepB: 'val' });
  });

  it('overwrites non-object step values instead of merging', async () => {
    const req = makeReq();
    await store.save(req, caseId, 0, { primitive: 'old' });
    await store.save(req, caseId, 1, { primitive: { nested: true } });

    const { data } = await store.load(req, caseId);
    expect(data.primitive).toEqual({ 0: 'o', 1: 'l', 2: 'd', nested: true });
  });

  it('generateReference prefixes based on slug', async () => {
    const req = makeReq();
    const ref = await store.generateReference(req, 'possession-claim', caseId);
    expect(ref.startsWith('PCR-')).toBe(true);
  });
});
