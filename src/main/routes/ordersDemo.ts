import { Application, Request, Response } from 'express';

// Temporary import from the header shell package; uses CommonJS, so require here for type simplicity.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderHeaderShell, renderFooterShell } = require('hmcts-header-shell-demo/render');

type DemoTheme = 'judicial' | 'case-manager' | 'default';

interface OrdersDemoViewModel {
  themeName: DemoTheme;
  headerShell: unknown;
  footerShell: unknown;
  caseReference: string;
  basePath: string;
  caseTitle: string;
  claimantName: string;
  defendantName: string;
  lastUpdated: string;
  lastUpdatedBy: string;
}

const keepOnlyCreateCaseNav = (html: string): string => {
  const listMatch = html.match(/(<ul class="hmcts-primary-navigation__list">)([\s\S]*?)(<\/ul>)/);
  if (!listMatch) {
    return html;
  }

  const items = Array.from(listMatch[2].matchAll(/<li class="hmcts-primary-navigation__item">[\s\S]*?<\/li>/g)).map(match => match[0]);
  const createCaseItem = items.find(item => /Create case/i.test(item));

  if (!createCaseItem) {
    return html;
  }

  return html.replace(
    listMatch[0],
    `${listMatch[1]}
                  ${createCaseItem}
                ${listMatch[3]}`
  );
};

const defaultCaseReference = '1234-5678-9101';

const buildViewModel = (req: Request, caseReferenceParam?: string): OrdersDemoViewModel => {
  const theme = typeof req.query.theme === 'string' ? req.query.theme : 'case-manager';
  const allowedThemes = new Set<DemoTheme>(['judicial', 'case-manager', 'default']);
  const themeName = allowedThemes.has(theme as DemoTheme) ? (theme as DemoTheme) : 'case-manager';
  const caseReference = caseReferenceParam && caseReferenceParam.trim() ? caseReferenceParam : defaultCaseReference;
  const basePath = `/orders-demo/${encodeURIComponent(caseReference)}`;

  const headerShell = (() => {
    const shell = renderHeaderShell({
      roles: ['pui-case-manager'],
      theme: themeName,
      assetBase: '/',
    });

    return {
      ...shell,
      html: keepOnlyCreateCaseNav(shell.html),
    };
  })();
  const footerShell = renderFooterShell({ assetBase: '/' });

  return {
    themeName,
    headerShell,
    footerShell,
    caseReference,
    basePath,
    caseTitle: 'Smith v Jones',
    claimantName: 'Smith',
    defendantName: 'Jones',
    lastUpdated: '25/10/2025',
    lastUpdatedBy: 'DJ Daley',
  };
};

export default function (app: Application): void {
  app.get('/orders-demo/:caseReference', (req: Request, res: Response) => {
    const viewModel = buildViewModel(req, req.params.caseReference);

    res.render('orders-demo', viewModel);
  });

  app.get('/orders-demo', (req: Request, res: Response) => {
    res.redirect(`/orders-demo/${defaultCaseReference}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`);
  });
}
