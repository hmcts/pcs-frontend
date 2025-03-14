import webpackConfig from '../../webpack.config';

import express from 'express';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';

const setupDev = (app: express.Express, developmentMode: boolean): void => {
  if (developmentMode) {
    const compiler = webpack(webpackConfig);
    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: '/',
      })
    );
  }
};

export { setupDev };
