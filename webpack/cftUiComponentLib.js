const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const styles = path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/styles/ui-component-lib.css'));

const copyComponentLibAssets = new CopyWebpackPlugin({
  patterns: [{ from: styles, to: 'assets/ui-component-lib' }],
});

module.exports = {
  paths: { styles },
  plugins: [copyComponentLibAssets],
};
