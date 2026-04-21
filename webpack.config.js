const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const sourcePath = path.resolve(__dirname, 'src/main/assets/js');
const govukFrontend = require(path.resolve(__dirname, 'webpack/govukFrontend'));
const scss = require(path.resolve(__dirname, 'webpack/scss'));
const HtmlWebpack = require(path.resolve(__dirname, 'webpack/htmlWebpack'));

const locales = path.resolve(__dirname, 'src/main/assets/locales');

const devMode = process.env.NODE_ENV !== 'production';
const fileNameSuffix = devMode ? '-dev' : '.[contenthash]';
const filename = `[name]${fileNameSuffix}.js`;

const appEntry = path.resolve(sourcePath, 'index.ts');
const entry = devMode
  ? ['webpack-hot-middleware/client?path=/__webpack_hmr&reload=true&overlay=true', appEntry]
  : appEntry;

module.exports = {
  plugins: [
    ...govukFrontend.plugins,
    ...scss.plugins,
    ...HtmlWebpack.plugins,
    new CopyWebpackPlugin({
      patterns: [{ from: locales, to: 'locales' }],
    }),
    ...(devMode ? [new webpack.HotModuleReplacementPlugin()] : []),
  ],
  entry,
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
