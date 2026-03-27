const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const sourcePath = path.resolve(__dirname, 'src/main/assets/js');
const govukFrontend = require(path.resolve(__dirname, 'webpack/govukFrontend'));
const uiComponentLib = require(path.resolve(__dirname, 'webpack/uiComponentLib'));
const scss = require(path.resolve(__dirname, 'webpack/scss'));
const HtmlWebpack = require(path.resolve(__dirname, 'webpack/htmlWebpack'));

const locales = path.resolve(__dirname, 'src/main/assets/locales');

const devMode = process.env.NODE_ENV !== 'production';
const fileNameSuffix = devMode ? '-dev' : '.[contenthash]';
const filename = `[name]${fileNameSuffix}.js`;

module.exports = {
  plugins: [
    ...govukFrontend.plugins,
    ...uiComponentLib.plugins,
    ...scss.plugins,
    ...HtmlWebpack.plugins,
    new CopyWebpackPlugin({
      patterns: [{ from: locales, to: 'locales' }],
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
