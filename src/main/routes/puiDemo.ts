import { Application, Request, Response } from 'express';

// Temporary import from the header shell package; uses CommonJS, so require here for type simplicity.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderHeaderShell } = require('hmcts-header-shell-demo/render');

export default function (app: Application): void {
  app.get('/pui-demo', (req: Request, res: Response) => {
    const theme = typeof req.query.theme === 'string' ? req.query.theme : 'case-manager';
    const allowedThemes = new Set(['judicial', 'case-manager', 'default']);
    const themeName = allowedThemes.has(theme) ? theme : 'case-manager';
    const nextTheme = themeName === 'judicial' ? 'case-manager' : 'judicial';
    const headerShell = renderHeaderShell({
      roles: ['pui-case-manager'],
      theme: themeName,
      assetBase: '/',
    });

    res.render('pui-demo', {
      themeName,
      nextTheme,
      headerShell,
    });
  });
}
