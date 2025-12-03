import { Application, Request, Response } from 'express';

// Temporary import from the header shell package; uses CommonJS, so require here for type simplicity.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderHeaderShell, renderFooterShell } = require('hmcts-header-shell-demo/render');

const basePayments = [
  { instance: 'Payment 1', dueDate: '31/01/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 2', dueDate: '27/02/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 3', dueDate: '31/03/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 4', dueDate: '30/04/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 5', dueDate: '31/05/2025', amountDue: '£125', amountPaid: '£0' },
  { instance: 'Payment 6', dueDate: '30/06/2025', amountDue: '£125', amountPaid: '£0' },
];

export default function (app: Application): void {
  app.get('/pui-demo', (req: Request, res: Response) => {
    const theme = typeof req.query.theme === 'string' ? req.query.theme : 'case-manager';
    const allowedThemes = new Set(['judicial', 'case-manager', 'default']);
    const themeName = allowedThemes.has(theme) ? theme : 'case-manager';
    const nextTheme = themeName === 'judicial' ? 'case-manager' : 'judicial';
    const removeParam = req.query.remove;
    const removeList = Array.isArray(removeParam)
      ? removeParam
      : typeof removeParam === 'string'
        ? [removeParam]
        : [];
    const validRemovals = removeList.filter(value => basePayments.some(payment => payment.instance === value));
    const removalSet = new Set(validRemovals);
    const payments = basePayments.filter(payment => !removalSet.has(payment.instance));
    const totalArrearsValue = payments.reduce((sum, payment) => {
      const numeric = parseInt(payment.amountDue.replace(/[^0-9.-]/g, ''), 10);
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
    const totalArrears = `£${totalArrearsValue}`;
    const caseReference = '#1234-5678-9101';
    const headerShell = renderHeaderShell({
      roles: ['pui-case-manager'],
      theme: themeName,
      assetBase: '/',
    });
    const footerShell = renderFooterShell({ assetBase: '/' });

    res.render('pui-demo', {
      themeName,
      nextTheme,
      headerShell,
      footerShell,
      payments,
      totalArrears,
      caseReference,
      removeList: Array.from(removalSet),
    });
  });
}
