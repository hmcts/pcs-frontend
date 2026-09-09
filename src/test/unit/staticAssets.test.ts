import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { gzipSync } from 'zlib';

import express from 'express';

import {
  IMMUTABLE_CACHE_CONTROL,
  REVALIDATE_CACHE_CONTROL,
  buildAssetHandler,
  isFingerprintedAsset,
} from '../../main/staticAssets';

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

const request = (port: number, urlPath: string, headers: http.OutgoingHttpHeaders = {}): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    const req = http.request({ port, path: urlPath, headers }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode as number, headers: res.headers, body: Buffer.concat(chunks) })
      );
    });
    req.on('error', reject);
    req.end();
  });

describe('isFingerprintedAsset', () => {
  it.each([
    'main.d3bd85ff37217eccffa7.js',
    'main.d3bd85ff37217eccffa7.css',
    'main.d3bd85ff37217eccffa7.js.gz',
    'main.d3bd85ff37217eccffa7.js.LICENSE.txt',
    '/public/assets/fonts/bold-b542beb274-v2.woff2',
    '/public/assets/fonts/light-f591b13f7d-v2.woff',
  ])('treats %s as fingerprinted', filePath => {
    expect(isFingerprintedAsset(filePath)).toBe(true);
  });

  it.each([
    '/public/assets/manifest.json',
    '/public/assets/images/favicon.ico',
    '/public/assets/images/govuk-crest.svg',
    '/public/assets/images/govuk-crest.svg.gz',
    '/public/locales/en/common.json',
    '/public/index.html',
    'ui-component-lib.css',
    'xui-header-shadow.css',
    'gds-transport-bold.woff2',
    'main-dev.js',
    'main-dev.css',
    '0.css',
  ])('treats %s as mutable', filePath => {
    expect(isFingerprintedAsset(filePath)).toBe(false);
  });

  it('matches the names the production build actually emits', () => {
    const publicDir = path.join(__dirname, '../../main/public');
    if (!fs.existsSync(publicDir)) {
      return;
    }

    const bundles = fs.readdirSync(publicDir).filter(name => /^main\..+\.(js|css)$/.test(name));
    expect(bundles.length).toBeGreaterThan(0);
    bundles.forEach(name => expect(isFingerprintedAsset(name)).toBe(true));

    const fontsDir = path.join(publicDir, 'assets/fonts');
    const fonts = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : [];
    expect(fonts.length).toBeGreaterThan(0);
    fonts.forEach(name => expect(isFingerprintedAsset(name)).toBe(true));

    expect(isFingerprintedAsset('assets/manifest.json')).toBe(false);
  });
});

describe('static asset serving', () => {
  const bundleBody = 'console.log("bundle");'.repeat(200);
  let root: string;
  let server: http.Server;
  let port: number;
  let sessionCalls: string[];

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pcs-static-'));
    fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(root, 'main.d3bd85ff37217eccffa7.js'), bundleBody);
    fs.writeFileSync(path.join(root, 'main.d3bd85ff37217eccffa7.js.gz'), gzipSync(Buffer.from(bundleBody)));
    fs.writeFileSync(path.join(root, 'assets/manifest.json'), '{"icons":[]}');
    fs.writeFileSync(path.join(root, 'assets/uncompressed.css'), 'body{color:red}');

    sessionCalls = [];
    const app = express();
    app.use(buildAssetHandler(root));
    app.use((req, res, next) => {
      sessionCalls.push(req.path);
      res.setHeader('Set-Cookie', 'pcs_session=abc; Path=/');
      next();
    });
    app.get('/page', (_req, res) => res.send('page'));

    server = await new Promise<http.Server>(resolve => {
      const created = app.listen(0, () => resolve(created));
    });
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('serves the precompressed bundle with a real Content-Length', async () => {
    const res = await request(port, '/main.d3bd85ff37217eccffa7.js', { 'Accept-Encoding': 'gzip' });
    const gzSize = fs.statSync(path.join(root, 'main.d3bd85ff37217eccffa7.js.gz')).size;

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers['content-length']).toBe(String(gzSize));
    expect(res.headers['transfer-encoding']).toBeUndefined();
    expect(res.body).toHaveLength(gzSize);
    expect(res.headers['content-type']?.toLowerCase()).toBe('text/javascript; charset=utf-8');
    expect(res.headers['vary']).toBe('Accept-Encoding');
    expect(res.headers['cache-control']).toBe(IMMUTABLE_CACHE_CONTROL);
  });

  it('serves the identity bundle when gzip is not accepted', async () => {
    const res = await request(port, '/main.d3bd85ff37217eccffa7.js', { 'Accept-Encoding': 'identity' });

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['content-length']).toBe(String(Buffer.byteLength(bundleBody)));
    expect(res.headers['content-type']?.toLowerCase()).toBe('text/javascript; charset=utf-8');
    expect(res.body.toString()).toBe(bundleBody);
    expect(res.headers['cache-control']).toBe(IMMUTABLE_CACHE_CONTROL);
  });

  it('falls back to the plain file when no precompressed sibling exists', async () => {
    const res = await request(port, '/assets/uncompressed.css', { 'Accept-Encoding': 'gzip, deflate, br' });

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['content-length']).toBe('15');
    expect(res.body.toString()).toBe('body{color:red}');
  });

  it('does not cache a mutable resource immutably', async () => {
    const res = await request(port, '/assets/manifest.json', { 'Accept-Encoding': 'gzip' });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(REVALIDATE_CACHE_CONTROL);
    expect(res.headers['cache-control']).not.toContain('immutable');
  });

  it('keeps the security headers Helmet would otherwise have set', async () => {
    const res = await request(port, '/main.d3bd85ff37217eccffa7.js', { 'Accept-Encoding': 'gzip' });

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
  });

  it('does not run the session middleware for asset requests', async () => {
    const bundle = await request(port, '/main.d3bd85ff37217eccffa7.js', { 'Accept-Encoding': 'gzip' });
    const manifest = await request(port, '/assets/manifest.json');

    expect(bundle.headers['set-cookie']).toBeUndefined();
    expect(manifest.headers['set-cookie']).toBeUndefined();
    expect(sessionCalls).toStrictEqual([]);

    const page = await request(port, '/page');

    expect(page.headers['set-cookie']).toStrictEqual(['pcs_session=abc; Path=/']);
    expect(sessionCalls).toStrictEqual(['/page']);
  });
});
