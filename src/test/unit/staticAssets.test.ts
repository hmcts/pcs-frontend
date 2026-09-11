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
  setupStaticAssets,
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

  it('matches the govuk-frontend asset names the build copies into public', () => {
    const govukAssets = path.join(path.dirname(require.resolve('govuk-frontend')), 'assets');

    const fonts = fs.readdirSync(path.join(govukAssets, 'fonts'));
    expect(fonts.length).toBeGreaterThan(0);
    fonts.forEach(name => expect(isFingerprintedAsset(name)).toBe(true));

    const images = fs.readdirSync(path.join(govukAssets, 'images'));
    expect(images.length).toBeGreaterThan(0);
    images.forEach(name => expect(isFingerprintedAsset(name)).toBe(false));

    expect(isFingerprintedAsset('manifest.json')).toBe(false);
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

describe('setupStaticAssets', () => {
  let server: http.Server;
  let port: number;
  let downstreamCalls: string[];

  beforeAll(async () => {
    downstreamCalls = [];
    const app = express();
    setupStaticAssets(app);
    app.use((req, res, next) => {
      downstreamCalls.push(req.path);
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
  });

  it('serves the cft component lib stylesheet with revalidating cache headers', async () => {
    const res = await request(port, '/assets/ui-component-lib/ui-component-lib.css');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(0);
    expect(res.headers['cache-control']).toBe(REVALIDATE_CACHE_CONTROL);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('does not cache the un-fingerprinted cft fonts immutably', async () => {
    const res = await request(port, '/assets/ui-component-lib/fonts/gds-transport-bold.woff2');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(REVALIDATE_CACHE_CONTROL);
  });

  it('falls through to the application when the asset does not exist', async () => {
    const res = await request(port, '/page');

    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('page');
    expect(downstreamCalls).toStrictEqual(['/page']);
  });
});
