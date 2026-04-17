import * as path from 'path';

import * as express from 'express';

export const setupDev = (app: express.Express, developmentMode: boolean): void => {
  if (!developmentMode) {
    return;
  }

  const webpackDev = require('webpack-dev-middleware');
  const webpackHot = require('webpack-hot-middleware');
  const chokidar = require('chokidar');
  const webpack = require('webpack');
  const webpackconfig = require('../../webpack.config');
  const compiler = webpack(webpackconfig);

  app.use(webpackDev(compiler, { publicPath: '/' }));
  const hotMiddleware = webpackHot(compiler, { path: '/__webpack_hmr' });
  app.use(hotMiddleware);

  const viewsRoot = path.join(__dirname, 'views');
  const stepsRoot = path.join(__dirname, 'steps');
  chokidar
    .watch([viewsRoot, stepsRoot], { ignoreInitial: true, ignored: (p: string) => /node_modules|\.git/.test(p) })
    .on('all', (_event: string, filePath: string) => {
      if (filePath.endsWith('.njk')) {
        // force reload for nunjucks
        hotMiddleware.publish({
          action: 'sync',
          hash: Date.now().toString(16),
          errors: [],
          warnings: [],
          modules: {},
        });
      }
    });
};
