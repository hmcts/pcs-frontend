const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const root = path.resolve(require.resolve('@hmcts-cft/cft-ui-component-lib'), '..');
const styles = path.resolve(root, 'src', 'styles');
const nunjucksTemplates = path.resolve(root, 'src', 'nunjucks');

const copyUiComponentLibAssets = new CopyWebpackPlugin({
  patterns: [
    { from: styles, to: 'assets/ui-component-lib' },
    { from: nunjucksTemplates, to: '../views/ui-component-lib' },
  ],
});

module.exports = {
  plugins: [copyUiComponentLibAssets],
};
