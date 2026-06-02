import { sanitiseUUID } from '../../../main/utils/uuid';

describe('sanitiseUUID', () => {
  it('returns trimmed uuid when valid', () => {
    expect(sanitiseUUID(' 181c89a0-ae0a-4b6b-aff4-36bd8b8122aa ')).toBe('181c89a0-ae0a-4b6b-aff4-36bd8b8122aa');
  });

  it('returns empty string when invalid', () => {
    expect(sanitiseUUID('not-a-uuid')).toBe('');
  });

  it('returns empty string when not a string', () => {
    expect(sanitiseUUID(undefined)).toBe('');
  });
});
