/**
 * @jest-environment node
 */
import { JSDOM } from 'jsdom';

import { type TestApp, bootMakeAClaim, ccd, claimPath, givenClaim } from './makeAClaimHarness';

const MB = 1024 * 1024;
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const WRONG_TYPE = 'The selected file must be a PDF, DOCX or XLSX';
const TOO_LARGE = 'The selected file must be smaller than 20MB';
const HINT = 'You can upload a PDF, Word (DOCX) or Excel (XLSX) file. Each file must be smaller than 20MB.';

const UPLOAD_STEPS = [
  'upload-tenancy-agreement',
  'upload-occupation-contract',
  'upload-notice',
  'upload-rent-statement',
  'upload-epc',
  'upload-gas-safety',
  'upload-eicr',
  'upload-other-documents',
];

const small = (name: string, type: string) => ({ name, type, content: Buffer.from('content') });

let app: TestApp;
afterEach(() => app?.close());

async function bootWithClaim(): Promise<void> {
  app = await bootMakeAClaim();
  givenClaim({ eligibility: { isTrespass: 'NO', whoIsClaiming: 'MYSELF' } });
}

describe('every make a claim upload page', () => {
  it.each(UPLOAD_STEPS)('%s offers only PDF, DOCX and XLSX, with the hint', async step => {
    await bootWithClaim();
    const response = await app.get(claimPath(step));
    expect(response.status).toBe(200);
    const document = new JSDOM(response.text).window.document;
    expect(document.querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.pdf,.docx,.xlsx');
    expect(
      document.querySelector('[data-module="moj-multi-file-upload"]')?.getAttribute('data-allowed-extensions')
    ).toBe('.pdf,.docx,.xlsx');
    expect(document.querySelector('[data-module="moj-multi-file-upload"]')?.getAttribute('data-max-file-size-mb')).toBe(
      '20'
    );
    expect(document.querySelector('[data-module="moj-multi-file-upload"]')?.getAttribute('data-error-wrong-type')).toBe(
      WRONG_TYPE
    );
    expect(
      document.querySelector('[data-module="moj-multi-file-upload"]')?.getAttribute('data-error-file-too-large')
    ).toBe(TOO_LARGE);
    expect(document.querySelector('.govuk-hint')?.textContent?.trim()).toBe(HINT);
  });

  it.each(UPLOAD_STEPS)('%s refuses a .doc', async step => {
    await bootWithClaim();
    const response = await app.upload(`${claimPath(step)}/upload`, small('statement.doc', 'application/msword'));
    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error.message).toBe(WRONG_TYPE);
    expect(ccd.cdamUploads).toBe(0);
  });
});

describe('uploading a rent statement', () => {
  const upload = (file: { name: string; type: string; content: Buffer }) =>
    app.upload(`${claimPath('upload-rent-statement')}/upload`, file);

  it.each([
    ['statement.doc', 'application/msword'],
    ['statement.xls', 'application/vnd.ms-excel'],
    ['statement.xlsm', 'application/vnd.ms-excel'],
    ['statement.docm', 'application/vnd.ms-word.document.macroEnabled.12'],
    ['statement.csv', 'text/csv'],
    ['statement.jpg', 'image/jpeg'],
    ['statement.pdf', DOCX],
    ['statement.docx', 'application/pdf'],
  ])('refuses %s sent as %s', async (name, type) => {
    await bootWithClaim();
    const response = await upload(small(name, type));
    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error.message).toBe(WRONG_TYPE);
    expect(ccd.cdamUploads).toBe(0);
  });

  it('refuses a PDF over 20MB', async () => {
    await bootWithClaim();
    const response = await upload({ name: 'statement.pdf', type: 'application/pdf', content: Buffer.alloc(21 * MB) });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error.message).toBe(TOO_LARGE);
    expect(ccd.cdamUploads).toBe(0);
  });

  it.each([
    ['statement.pdf', 'application/pdf'],
    ['statement.docx', DOCX],
    ['statement.xlsx', XLSX],
  ])('accepts %s', async (name, type) => {
    await bootWithClaim();
    const response = await upload(small(name, type));
    expect(response.status).toBe(200);
    expect(ccd.cdamUploads).toBe(1);
  });
});
