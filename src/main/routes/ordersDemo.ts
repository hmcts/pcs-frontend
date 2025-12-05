import { Application, Request, Response } from 'express';
import { format } from 'date-fns';

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
  otherDefendants: string[];
  defendants: string[];
  lastUpdated: string;
  lastUpdatedBy: string;
  dateOfTenancy: string;
  dateNoticeServed: string;
  grounds: string;
  arrearsOnIssue: string;
  arrearsAtNotice: string;
  arrearsAtHearing: string;
  currentRent: string;
  currentRentFrequency: 'month' | 'quarter' | 'year';
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
  const theme = typeof req.query.theme === 'string' ? req.query.theme : 'judicial';
  const allowedThemes = new Set<DemoTheme>(['judicial', 'case-manager', 'default']);
  const themeName = allowedThemes.has(theme as DemoTheme) ? (theme as DemoTheme) : 'judicial';
  const caseReference = caseReferenceParam && caseReferenceParam.trim() ? caseReferenceParam : defaultCaseReference;
  const basePath = `/orders-demo/${encodeURIComponent(caseReference)}`;

  const headerShell = (() => {
    const roles = themeName === 'judicial' ? ['pui-judicial'] : ['pui-case-manager'];
    const shell = renderHeaderShell({
      roles,
      theme: themeName,
      assetBase: '/',
    });

    const adjustedHtml = keepOnlyCreateCaseNav(shell.html)
      .replace(/data-theme="[^"]*"/, `data-theme="${themeName}"`)
      .replace(/data-roles="[^"]*"/, `data-roles="${roles.join(',')}"`);

    return {
      ...shell,
      html: adjustedHtml,
    };
  })();
  const footerShell = renderFooterShell({ assetBase: '/' });
  const otherDefendants = ['Taylor', 'Patel'];
  const today = format(new Date(), 'dd/MM/yyyy');

  return {
    themeName,
    headerShell,
    footerShell,
    caseReference,
    basePath,
    caseTitle: 'Smith v Jones',
    claimantName: 'Smith',
    defendantName: 'Jones',
    otherDefendants,
    defendants: ['Jones', ...otherDefendants],
    lastUpdated: today,
    lastUpdatedBy: 'DJ Daley',
    dateOfTenancy: '01/05/2020',
    dateNoticeServed: '15/09/2024',
    grounds: '8, 10, 11',
    arrearsOnIssue: '825.00',
    arrearsAtNotice: '1100.00',
    arrearsAtHearing: '1250.00',
    currentRent: '550.00',
    currentRentFrequency: 'month',
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
