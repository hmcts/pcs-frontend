import { Application, Request, Response } from 'express';

// Temporary import from the header shell package; uses CommonJS, so require here for type simplicity.
const { renderHeaderShell, renderFooterShell } = require('hmcts-header-shell-demo/render');

const basePayments = [
  { instance: 'Payment 1', dueDate: '31/01/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 2', dueDate: '27/02/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 3', dueDate: '31/03/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 4', dueDate: '30/04/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 5', dueDate: '31/05/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 6', dueDate: '30/06/2025', amountDue: '£125', amountPaid: '£0' },
];

type DemoTheme = 'judicial' | 'case-manager' | 'default';

interface DemoViewModel {
  themeName: DemoTheme;
  headerShell: unknown;
  footerShell: unknown;
  payments: typeof basePayments;
  totalArrears: string;
  caseReference: string;
  basePath: string;
  removeList: string[];
  paymentsQueryString: string;
}

const keepOnlyCreateCaseNav = (html: string): string => {
  const listMatch = html.match(/(<ul class="hmcts-primary-navigation__list">)([\s\S]*?)(<\/ul>)/);
  if (!listMatch) {
    return html;
  }

  const items = Array.from(listMatch[2].matchAll(/<li class="hmcts-primary-navigation__item">[\s\S]*?<\/li>/g)).map(
    match => match[0]
  );
  const createCaseItem = items.find(item => /Create case/i.test(item));
  const myWorkItem = `
                  <li class="hmcts-primary-navigation__item">
                    <a class="hmcts-primary-navigation__link" href="/work">
                      <span class="hmcts-primary-navigation__link-text">My work</span>
                    </a>
                  </li>`;

  const baseItems = createCaseItem ? [createCaseItem] : items;
  const navItems = baseItems.some(item => /My work/i.test(item)) ? baseItems : [myWorkItem, ...baseItems];

  return html.replace(
    listMatch[0],
    `${listMatch[1]}
                  ${navItems.join('\n                  ')}
                ${listMatch[3]}`
  );
};

const defaultCaseReference = '1234-5678-9101';

const buildDemoViewModel = (req: Request, caseReferenceParam?: string): DemoViewModel => {
  const theme = typeof req.query.theme === 'string' ? req.query.theme : 'case-manager';
  const allowedThemes = new Set<DemoTheme>(['judicial', 'case-manager', 'default']);
  const themeName = allowedThemes.has(theme as DemoTheme) ? (theme as DemoTheme) : 'case-manager';
  const caseReference = caseReferenceParam && caseReferenceParam.trim() ? caseReferenceParam : defaultCaseReference;
  const basePath = `/pui-demo/${encodeURIComponent(caseReference)}`;

  const removeParam = req.query.remove;
  const removeCandidates = Array.isArray(removeParam)
    ? removeParam
    : typeof removeParam === 'string'
      ? [removeParam]
      : [];
  const removeList = removeCandidates.filter((value): value is string => typeof value === 'string');
  const validRemovals = removeList.filter(value => basePayments.some(payment => payment.instance === value));
  const removalSet = new Set(validRemovals);
  const payments = basePayments.filter(payment => !removalSet.has(payment.instance));

  const totalArrearsValue = payments.reduce((sum, payment) => {
    const numeric = parseInt(payment.amountDue.replace(/[^0-9.-]/g, ''), 10);
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
  const totalArrears = `£${totalArrearsValue}`;
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

  const queryParts = [
    `theme=${encodeURIComponent(themeName)}`,
    ...Array.from(removalSet).map(value => `remove=${encodeURIComponent(value)}`),
  ];
  const paymentsQueryString = queryParts.length ? `?${queryParts.join('&')}` : '';

  return {
    themeName,
    headerShell,
    footerShell,
    payments,
    totalArrears,
    caseReference,
    basePath,
    removeList: Array.from(removalSet),
    paymentsQueryString,
  };
};

export default function (app: Application): void {
  app.get('/pui-demo/:caseReference/check-answers', (req: Request, res: Response) => {
    const viewModel = buildDemoViewModel(req, req.params.caseReference);
    const addPaymentChoice =
      typeof req.query['add-payment'] === 'string' && req.query['add-payment'] === 'yes' ? 'Yes' : 'No';

    res.render('pui-demo-check-answers', {
      ...viewModel,
      addPaymentChoice,
      outstandingPaymentCount: viewModel.payments.length,
    });
  });

  app.get('/pui-demo/check-answers', (req: Request, res: Response) => {
    res.redirect(
      `/pui-demo/${defaultCaseReference}/check-answers${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`
    );
  });

  app.get('/pui-demo/:caseReference', (req: Request, res: Response) => {
    const viewModel = buildDemoViewModel(req, req.params.caseReference);

    res.render('pui-demo', viewModel);
  });

  app.get('/pui-demo', (req: Request, res: Response) => {
    res.redirect(
      `/pui-demo/${defaultCaseReference}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`
    );
  });
}
