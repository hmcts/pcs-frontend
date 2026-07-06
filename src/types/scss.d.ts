// Side-effect scss imports are handled by webpack (style/css/sass loaders);
// typed as an opaque module so tsc doesn't error on them (TS2882 under TS 6+).
declare module '*.scss';
