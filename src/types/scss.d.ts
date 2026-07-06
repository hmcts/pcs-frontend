// Lets TypeScript accept `import 'file.scss'` statements.
// Stylesheets are compiled by webpack (sass/css/style loaders), not by tsc, so
// they have no types. Declaring them as empty modules avoids the compile error
// TS2882 "Cannot find module or type declarations for ...".
declare module '*.scss';
