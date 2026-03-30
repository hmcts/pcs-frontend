const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const rootExport = require.resolve('govuk-frontend');
const root = path.resolve(rootExport, '..');
const sass = path.resolve(root, 'all.scss');
const javascript = path.resolve(root, 'all.js');
const components = path.resolve(root, 'components');
const assets = path.resolve(root, 'assets');
const images = path.resolve(assets, 'images');
const fonts = path.resolve(assets, 'fonts');
const rebrand = path.resolve(assets, 'rebrand');


const root2 = path.resolve(require.resolve('@hmcts-cft/cft-ui-component-lib', '..'));

const cftWebpack = new CopyWebpackPlugin({
  patterns: [
    { from: path.resolve(root2, '../../../src/styles'), to: 'assets/ui-component-lib' },
    { from: path.resolve(root2, 'nunjucks'), to: '../views/ui-component-lib' },
  ],
});

const copyGovukTemplateAssets = new CopyWebpackPlugin({
  patterns: [
    { from: images, to: 'assets/images' },
    { from: fonts, to: 'assets/fonts' },
    { from: rebrand, to: 'assets/rebrand' },
    { from: `${assets}/manifest.json`, to: 'assets' },
    { from: `${root}/template.njk`, to: '../views/govuk' },
    { from: `${root}/components`, to: '../views/govuk/components' },
    { from: `${root}/macros`, to: '../views/govuk/macros' },
  ],
});

module.exports = {
  paths: { template: root, components, sass, javascript, assets },
  plugins: [copyGovukTemplateAssets, cftWebpack],
};
