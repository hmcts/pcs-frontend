const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

// package "main" is moj/all.js — resolve package root then moj/components
const pkgRoot = path.resolve(require.resolve('@ministryofjustice/frontend/package.json'), '..');
const components = path.resolve(pkgRoot, 'moj', 'components');

const copyMojTemplateAssets = new CopyWebpackPlugin({
  patterns: [{ from: components, to: '../views/moj/components' }],
});

module.exports = {
  plugins: [copyMojTemplateAssets],
};
