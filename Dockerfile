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
# Pruned here rather than in `runtime` so the ~190MB yarn cache it needs stays in
# this throwaway stage.
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

# CMD is `yarn start`, so yarn has to resolve offline. That needs the release that
# yarnPath points at *and* corepack's cache, because `packageManager` makes `yarn` a
# corepack shim that downloads the pinned version when it is missing. Copying all of
# .yarn instead would drag in the ~190MB package cache.
USER root
RUN mkdir -p /app/.yarn && chown -R hmcts:hmcts /app/.yarn
USER hmcts
COPY --chown=hmcts:hmcts .yarn/releases ./.yarn/releases
COPY --from=prod-deps --chown=hmcts:hmcts /home/hmcts/.cache/node/corepack /home/hmcts/.cache/node/corepack

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
