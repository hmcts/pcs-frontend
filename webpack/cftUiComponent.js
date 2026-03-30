const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const cftRoot = path.resolve(require.resolve('@hmcts-cft/cft-ui-component-lib', '..'));
const cftAsset = path.resolve(cftRoot, '../../../src/styles');
const cftNunjucks = path.resolve(cftRoot, '../../../src/nunjucks');

const cftWebpack = new CopyWebpackPlugin({
  patterns: [
    { from: cftAsset, to: '../assets/ui-component-lib' },
    { from: cftNunjucks, to: '../views/ui-component-lib' },
  ],
});


module.exports = {
  paths: { template: cftAsset },
  plugins: [cftWebpack],
};
