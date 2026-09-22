import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { gzipSync } from 'zlib';

import express from 'express';

import { setupStaticAssets } from '../../main/staticAssets';

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

const request = (
  port: number,
  urlPath: string,
  headers: http.OutgoingHttpHeaders = {},
  method = 'GET'
): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    const req = http.request({ port, path: urlPath, headers, method }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode as number, headers: res.headers, body: Buffer.concat(chunks) })
      );
    });
    req.on('error', reject);
    req.end();
  });

const BUNDLE = '/bundles/main.d3bd85ff37217eccffa7.js';
const IMMUTABLE = 'public, max-age=31536000, immutable';

describe('setupStaticAssets', () => {
  const bundleBody = 'console.log("bundle");'.repeat(200);
  let root: string;
  let server: http.Server | undefined;
  let port: number;
  let downstreamCalls: string[];

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pcs-static-'));
    fs.mkdirSync(path.join(root, 'bundles'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets/ui-component-lib'), { recursive: true });
    fs.mkdirSync(path.join(root, 'locales'), { recursive: true });
    fs.writeFileSync(path.join(root, 'bundles/main.d3bd85ff37217eccffa7.js'), bundleBody);
    fs.writeFileSync(path.join(root, 'bundles/main.d3bd85ff37217eccffa7.js.gz'), gzipSync(Buffer.from(bundleBody)));
    fs.writeFileSync(path.join(root, 'assets/manifest.json'), '{"icons":[]}');
    fs.writeFileSync(path.join(root, 'assets/ui-component-lib/ui-component-lib.css'), 'body{color:red}');
    fs.writeFileSync(path.join(root, 'locales/en.json'), '{"hello":"world"}');

    downstreamCalls = [];
    const app = express();
    setupStaticAssets(app, root);
    app.use((req, res, next) => {
      downstreamCalls.push(req.path);
      res.setHeader('Set-Cookie', 'pcs_session=abc; Path=/');
      next();
    });
    app.get('/page', (_req, res) => res.send('page'));
    app.use((_req, res) => res.status(404).type('html').send('<p>not found</p>'));

    server = await new Promise<http.Server>(resolve => {
      const created = app.listen(0, () => resolve(created));
    });
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server?.close(resolve));
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('serves the precompressed bundle with a real Content-Length', async () => {
    const res = await request(port, BUNDLE, { 'Accept-Encoding': 'gzip' });
    const gzSize = fs.statSync(path.join(root, 'bundles/main.d3bd85ff37217eccffa7.js.gz')).size;

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers['content-length']).toBe(String(gzSize));
    expect(res.headers['transfer-encoding']).toBeUndefined();
    expect(res.headers['content-type']?.toLowerCase()).toBe('text/javascript; charset=utf-8');
    expect(res.headers['vary']).toBe('Accept-Encoding');
    expect(res.headers['cache-control']).toBe(IMMUTABLE);
  });

  it('serves the identity bundle when gzip is not accepted', async () => {
    const res = await request(port, BUNDLE, { 'Accept-Encoding': 'identity' });

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['content-length']).toBe(String(Buffer.byteLength(bundleBody)));
    expect(res.body.toString()).toBe(bundleBody);
    expect(res.headers['cache-control']).toBe(IMMUTABLE);
  });

  it.each(['POST', 'PUT', 'DELETE', 'OPTIONS'])(
    'does not leave encoding headers on a %s to a bundle path',
    async method => {
      const res = await request(port, BUNDLE, { 'Accept-Encoding': 'gzip' }, method);

      expect(res.status).toBe(404);
      expect(res.headers['content-encoding']).toBeUndefined();
      expect(res.headers['vary']).toBeUndefined();
      expect(res.headers['content-type']).toContain('text/html');
    }
  );

  it('does not serve the compressed sibling as its own immutable URL', async () => {
    const res = await request(port, `${BUNDLE}.gz`, { 'Accept-Encoding': 'gzip' });

    expect(res.status).toBe(404);
    expect(res.headers['cache-control'] ?? '').not.toContain('immutable');
  });

  it('does not answer a percent-encoded bundle path', async () => {
    const res = await request(port, '/bundles/main%2Ed3bd85ff37217eccffa7%2Ejs', { 'Accept-Encoding': 'gzip' });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('leaves malformed urls to the application', async () => {
    const res = await request(port, '/%ZZ');

    expect(res.status).toBe(404);
    expect(res.body.toString()).toBe('<p>not found</p>');
  });

  it('does not redirect a directory request', async () => {
    const res = await request(port, '/assets');

    expect(res.status).toBe(404);
    expect(res.headers['location']).toBeUndefined();
  });

  it('caches build-time assets for a week rather than immutably', async () => {
    const manifest = await request(port, '/assets/manifest.json');
    const componentLib = await request(port, '/assets/ui-component-lib/ui-component-lib.css');

    expect(manifest.status).toBe(200);
    expect(manifest.headers['cache-control']).toBe('public, max-age=604800');
    expect(componentLib.status).toBe(200);
    expect(componentLib.headers['content-type']).toContain('text/css');
    expect(componentLib.headers['cache-control']).toBe('public, max-age=604800');
  });

  it('serves locale files', async () => {
    const res = await request(port, '/locales/en.json');

    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('{"hello":"world"}');
  });

  it('does not run the session middleware for asset requests', async () => {
    const before = [...downstreamCalls];
    const bundle = await request(port, BUNDLE, { 'Accept-Encoding': 'gzip' });
    const manifest = await request(port, '/assets/manifest.json');

    expect(bundle.headers['set-cookie']).toBeUndefined();
    expect(manifest.headers['set-cookie']).toBeUndefined();
    expect(downstreamCalls).toStrictEqual(before);
  });

  it('falls through to the application for non-asset paths', async () => {
    const res = await request(port, '/page');

    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('page');
    expect(res.headers['set-cookie']).toStrictEqual(['pcs_session=abc; Path=/']);
    expect(downstreamCalls).toContain('/page');
  });
});
