import { Application, Request, Response } from 'express';

export default function (app: Application): void {
  app.get('/pui-demo', (req: Request, res: Response) => {
    const theme = typeof req.query.theme === 'string' ? req.query.theme : 'case-manager';
    const allowedThemes = new Set(['judicial', 'case-manager', 'default']);
    const themeName = allowedThemes.has(theme) ? theme : 'case-manager';
    const nextTheme = themeName === 'judicial' ? 'case-manager' : 'judicial';

    res.render('pui-demo', {
      themeName,
      nextTheme,
    });
  });
}
