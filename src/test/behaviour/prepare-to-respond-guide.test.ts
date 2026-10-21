/**
 * @jest-environment node
 *
 * Node's environment rather than jsdom's, whose fetch globals the OIDC client cannot use.
 *
 * The public guide to preparing a response, served by the whole application as it starts in production, but with
 * Redis refusing connections and IDAM never answering: the guide and its assets must not wait on either, while the
 * case pages still do.
 */
import * as fs from 'node:fs';
import * as http from 'node:http';
import { type AddressInfo } from 'node:net';
import * as path from 'node:path';

import type { Express } from 'express';
import { JSDOM } from 'jsdom';

import enGuide from '../../main/assets/locales/en/prepareToRespond.json';
import { GUIDE_SECTIONS, PREPARE_TO_RESPOND_PATH } from '../../main/guidance/prepareToRespond';

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  text: string;
}

/** A local port nothing listens on, so connections to it are refused at once. */
async function closedPort(): Promise<number> {
  const server = http.createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise(resolve => server.close(resolve));
  return port;
}

const PUBLIC_DIR = path.resolve(__dirname, '../../main/public');
const ASSET = 'guide-test-asset.css';

let app: Express;
let server: http.Server;
/** An IDAM that holds every request open until the tests finish. */
let idam: http.Server;
let issuer: string;
const heldByIdam: http.ServerResponse[] = [];
let baseUrl: string;

function request(
  method: string,
  url: string,
  headers: http.OutgoingHttpHeaders = {},
  timeout = 10000
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${url}`, { method, agent: false, headers, timeout }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (text += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text }));
    });
    req.on('timeout', () => req.destroy(new Error(`${method} ${url} timed out`)));
    req.on('error', reject);
    req.end();
  });
}

const get = (url: string, headers?: http.OutgoingHttpHeaders) => request('GET', url, headers);

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

beforeAll(async () => {
  idam = http.createServer((req, res) => heldByIdam.push(res));
  // On every local address: the OIDC module allows plain HTTP for an issuer on localhost only.
  await new Promise<void>(resolve => idam.listen(0, resolve));
  process.env.REDIS_CONNECTION_STRING = `redis://127.0.0.1:${await closedPort()}`;
  issuer = `http://localhost:${(idam.address() as AddressInfo).port}/o`;
  process.env.OIDC_ISSUER = issuer;
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, ASSET), 'body {}');

  // config reads the environment when first loaded, so import the application after setting it.
  ({ app } = await import('../../main/app'));
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  fs.rmSync(path.join(PUBLIC_DIR, ASSET), { force: true });
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  // Let the application finish starting, as it would once IDAM is back.
  for (const res of heldByIdam) {
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
      })
    );
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  idam.closeAllConnections();
  await new Promise(resolve => idam.close(resolve));
  // Redis never connected, so drop its clients rather than wait for them to quit.
  app.locals.redisClient.disconnect();
  app.locals.s2s.subscriber?.disconnect();
  app.locals.launchDarklyClient.close();
});

describe('the guide to preparing a response to a possession claim', () => {
  it('is readable by someone who has not signed in, without a session', async () => {
    const response = await get(PREPARE_TO_RESPOND_PATH);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    const page = parse(response.text);
    expect(page.querySelector('h1')?.textContent).toContain('Respond to a claim for possession of a rented property');
  });

  it('answers HEAD requests', async () => {
    const response = await request('HEAD', PREPARE_TO_RESPOND_PATH);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('is readable by someone who is signed in, without looking at their session', async () => {
    const response = await get(PREPARE_TO_RESPOND_PATH, { cookie: 'pcs-session=s:someone-signed-in.signature' });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('serves the assets pages need', async () => {
    const response = await get(`/${ASSET}`);

    expect(response.status).toBe(200);
    expect(response.text).toBe('body {}');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('keeps the application security headers', async () => {
    for (const url of [PREPARE_TO_RESPOND_PATH, `/${ASSET}`]) {
      const { headers } = await get(url);
      expect(headers['content-security-policy']).toContain("default-src 'none'");
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
  });

  it('asks search engines not to index it, while letting them fetch it', async () => {
    const response = await get(PREPARE_TO_RESPOND_PATH);

    expect(response.headers['x-robots-tag']).toBe('noindex');
    expect(parse(response.text).querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
  });

  it('still needs IDAM for the case pages', async () => {
    await expect(request('GET', '/claims', {}, 1000)).rejects.toThrow('timed out');
  });

  it('shows each section once, numbered in order, with the count it states', async () => {
    const page = parse((await get(PREPARE_TO_RESPOND_PATH)).text);

    const headings = [...page.querySelectorAll('.govuk-accordion__section-heading')].map(h => h.textContent!.trim());
    expect(headings).toEqual(
      GUIDE_SECTIONS.map(({ key }, index) => `Step ${index + 1}: ${enGuide.sections[key].title}`)
    );
    expect(page.body.textContent).toContain(`There are ${GUIDE_SECTIONS.length} sections.`);
    const ids = [...page.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('can be read without JavaScript: every section is in the page', async () => {
    const page = parse((await get(PREPARE_TO_RESPOND_PATH)).text);

    const sections = page.querySelectorAll('.govuk-accordion__section-content');
    expect(sections).toHaveLength(GUIDE_SECTIONS.length);
    expect(sections[2].textContent).toContain('If the claim against you is based on rent arrears');
    expect(sections[0].querySelectorAll('li')).toHaveLength(4);
  });

  it('tells people the service is a pilot and when they can respond online', async () => {
    const page = parse((await get(PREPARE_TO_RESPOND_PATH)).text);

    expect(page.querySelector('.govuk-phase-banner')?.textContent).toContain('only available in some courts');
    expect(page.body.textContent).toContain(enGuide.pilotScope);
  });

  it('links to responding online, and nowhere that needs a signed-in session', async () => {
    const page = parse((await get(PREPARE_TO_RESPOND_PATH)).text);

    const respondOnline = [...page.querySelectorAll('main a')].find(a => a.textContent === enGuide.readyLink);
    expect(respondOnline?.getAttribute('href')).toBe('/access-your-case');
    const hrefs = [...page.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(hrefs).not.toContain('#');
    expect(hrefs).not.toContain('/logout');
    expect(hrefs).not.toContain('/claims');
    expect(page.querySelector('#timeout-modal-container')).toBeNull();
    expect(page.body.dataset.sessionTimeout).toBeUndefined();
  });

  it('is in English, and stays in English until the Welsh translation is added', async () => {
    const english = parse((await get(PREPARE_TO_RESPOND_PATH)).text);
    const welsh = parse((await get(`${PREPARE_TO_RESPOND_PATH}?lang=cy`)).text);

    expect(english.documentElement.lang).toBe('en');
    expect(welsh.documentElement.lang).toBe('en');
    expect(welsh.querySelector('h1')?.textContent).toContain(enGuide.heading);
    expect(english.querySelector('.govuk-language-toggle')).toBeNull();
  });
});
