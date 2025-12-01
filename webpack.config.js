const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const sourcePath = path.resolve(__dirname, 'src/main/assets/js');
const govukFrontend = require(path.resolve(__dirname, 'webpack/govukFrontend'));
const scss = require(path.resolve(__dirname, 'webpack/scss'));
const HtmlWebpack = require(path.resolve(__dirname, 'webpack/htmlWebpack'));
const headerComponentPath = path.resolve(__dirname, 'node_modules/hmcts-header-shell-demo');

const locales = path.resolve(__dirname, 'src/main/assets/locales');

const devMode = process.env.NODE_ENV !== 'production';
const fileNameSuffix = devMode ? '-dev' : '.[contenthash]';
const filename = `[name]${fileNameSuffix}.js`;

module.exports = {
  plugins: [
    ...govukFrontend.plugins,
    ...scss.plugins,
    ...HtmlWebpack.plugins,
    new CopyWebpackPlugin({
      patterns: [{ from: locales, to: 'locales' }],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.join(headerComponentPath, 'hmcts-header.js'), to: '.' },
        { from: path.join(headerComponentPath, 'hmcts-footer.js'), to: '.' },
        { from: path.join(headerComponentPath, 'header-styles.css'), to: '.' },
        { from: path.join(headerComponentPath, 'combined-inline.css'), to: '.' },
        { from: path.join(headerComponentPath, 'shell-styles.css'), to: '.' },
        { from: path.join(headerComponentPath, 'assets'), to: 'assets' },
      ],
    }),
  ],
  entry: path.resolve(sourcePath, 'index.ts'),
  mode: devMode ? 'development' : 'production',
  devtool: devMode ? 'source-map' : false,
  module: {
    rules: [
      ...scss.rules,
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'src/main/public/'),
    publicPath: '',
    filename,
  },
};
