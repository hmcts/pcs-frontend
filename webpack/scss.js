const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const devMode = process.env.NODE_ENV !== 'production';
const fileNameSuffix = devMode ? '-dev' : '.[contenthash]';
const filename = `bundles/[name]${fileNameSuffix}.css`;

const miniCss = new MiniCssExtractPlugin({
  filename,
  chunkFilename: `bundles/[id]${fileNameSuffix}.css`,
});

module.exports = {
  rules: [
    {
      test: /\.scss$/,
      use: [
        'style-loader',
        {
          loader: MiniCssExtractPlugin.loader,
          options: {
            esModule: false,
          },
        },
        {
          loader: 'css-loader',
          options: {
            url: false,
          },
        },
        {
          loader: 'sass-loader',
          options: {
            sassOptions: {
              quietDeps: true,
            },
          },
        },
      ],
    },
  ],
  plugins: [miniCss],
};
