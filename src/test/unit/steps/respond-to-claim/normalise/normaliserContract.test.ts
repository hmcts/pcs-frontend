import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const NORMALISER_DIR = 'src/main/steps/respond-to-claim/normalise';

// Normalisers must NOT touch defendantContactDetails.* — those fields are rebuilt
// from PartyEntity by the BE on every START callback, so dropping them is a no-op
// across requests. See TSDoc on Normaliser type.
describe('normaliser contract', () => {
  const normaliserFiles = readdirSync(NORMALISER_DIR).filter(
    f => f.startsWith('normalise') && f.endsWith('.ts') && !f.endsWith('.test.ts')
  );

  it('discovers at least one normaliser file', () => {
    expect(normaliserFiles.length).toBeGreaterThan(0);
  });

  it.each(normaliserFiles)('%s does not reference defendantContactDetails', file => {
    const source = readFileSync(join(NORMALISER_DIR, file), 'utf8');
    expect(source).not.toMatch(/defendantContactDetails/);
  });
});
