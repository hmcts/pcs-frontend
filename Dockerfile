# ---- Base image ----
FROM hmctsprod.azurecr.io/base/node:20-alpine AS base

USER root
RUN corepack enable
USER hmcts

# ---- Dependencies image ----
FROM base AS dependencies

WORKDIR /app
# Ensure hmcts user owns the /app directory
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./
COPY --chown=hmcts:hmcts .yarn ./.yarn

# Install all dependencies
RUN yarn install

# ---- Build image ----
FROM dependencies AS build

WORKDIR /app
# Copy source files needed for build
COPY --chown=hmcts:hmcts tsconfig.json webpack.config.js ./
COPY --chown=hmcts:hmcts webpack ./webpack
COPY --chown=hmcts:hmcts src ./src
COPY --chown=hmcts:hmcts config ./config

# Build the frontend assets
RUN yarn build:prod && \
    rm -rf webpack/ webpack.config.js

# Compile TypeScript to JavaScript
RUN yarn build:server

# ---- Production dependencies image ----
# Prunes the full dependency tree down to production-only. Runs here rather than
# in `runtime` so that the yarn cache (~190MB, needed to resolve packages
# offline) stays in this throwaway stage and never lands in a runtime layer.
FROM dependencies AS prod-deps

WORKDIR /app
ENV NODE_ENV=production
RUN yarn workspaces focus --production --all

# ---- Runtime image ----
FROM base AS runtime

WORKDIR /app
# Ensure hmcts user owns the /app directory in runtime stage
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

# Copy package files
COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./

# The base image CMD is `yarn start`, so yarn must be resolvable at runtime.
# Only `.yarn/releases` (the binary `yarnrc.yml`'s `yarnPath` points at) is needed
# — copying the whole `.yarn` tree would also ship `.yarn/cache` (~190MB).
# Pre-create and chown the directory as root so the copy target, and any
# `install-state.gz` yarn writes at runtime, are writable by hmcts.
USER root
RUN mkdir -p /app/.yarn && chown -R hmcts:hmcts /app/.yarn
USER hmcts
COPY --chown=hmcts:hmcts .yarn/releases ./.yarn/releases

# `packageManager` in package.json makes the `yarn` on PATH a corepack shim, which
# resolves the pinned yarn from corepack's own cache and tries to DOWNLOAD it if
# absent. Previously that cache was populated as a side effect of running yarn in
# this stage; now that dependency resolution happens in prod-deps, carry the cache
# over explicitly (~3.6MB) so the container never needs network access to start.
COPY --from=prod-deps --chown=hmcts:hmcts /home/hmcts/.cache/node/corepack /home/hmcts/.cache/node/corepack

# Production dependencies, resolved offline in the prod-deps stage
COPY --from=prod-deps --chown=hmcts:hmcts /app/node_modules ./node_modules

ENV NODE_ENV=production

# Copy only compiled code and necessary assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/main/public ./dist/main/public
COPY --from=build /app/src/main/views ./dist/main/views
COPY --from=build /app/src/main/steps ./dist/main/steps
COPY --from=build /app/config ./config

RUN chmod +x /app/dist/main/server.js

# Expose the application port
EXPOSE 3209
