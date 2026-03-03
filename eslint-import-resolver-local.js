'use strict';

const fs = require('fs');
const Module = require('module');
const nodeResolver = require('eslint-import-resolver-node');
const path = require('path');
const { createMatchPath, loadConfig } = require('tsconfig-paths');

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json', '.node', '.mjs'];

exports.interfaceVersion = 2;

const createRequire =
  Module.createRequire ||
  Module.createRequireFromPath ||
  function (filename) {
    const mod = new Module(filename);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    mod._compile('module.exports = require;', filename);
    return mod.exports;
  };

function getMatcher(config) {
  const project = typeof config?.project === 'string' ? config.project : './tsconfig.json';
  const loadedConfig = loadConfig(path.resolve(process.cwd(), project));

  if (loadedConfig.resultType !== 'success') {
    return null;
  }

  return createMatchPath(
    loadedConfig.absoluteBaseUrl,
    loadedConfig.paths,
    ['main', 'module', 'types'],
    loadedConfig.addMatchAll
  );
}

exports.resolve = function resolve(source, file, config = {}) {
  const nodeConfig = {
    extensions: DEFAULT_EXTENSIONS,
    ...config,
  };

  const resolvedFromNode = nodeResolver.resolve(source, file, nodeConfig);
  if (resolvedFromNode.found) {
    return resolvedFromNode;
  }

  try {
    const resolvedFromRequire = createRequire(path.resolve(file)).resolve(source);
    if (resolvedFromRequire) {
      return { found: true, path: resolvedFromRequire };
    }
  } catch {
    // Fall through to TS path alias resolution.
  }

  const matchPath = getMatcher(config);
  if (!matchPath) {
    return { found: false };
  }

  const matchedPath = matchPath(source, undefined, fs.existsSync, nodeConfig.extensions);
  if (!matchedPath) {
    return { found: false };
  }

  return nodeResolver.resolve(matchedPath, file, nodeConfig);
};
