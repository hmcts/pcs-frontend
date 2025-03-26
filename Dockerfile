# ---- Base image ----
FROM hmctspublic.azurecr.io/base/node:20-alpine AS base

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

# Install dependencies
RUN yarn install --frozen-lockfile

# ---- Build image ----
FROM dependencies AS build

# Copy source files needed for build
COPY --chown=hmcts:hmcts tsconfig.json webpack.config.js ./
COPY --chown=hmcts:hmcts webpack ./webpack
COPY --chown=hmcts:hmcts src ./src
COPY --chown=hmcts:hmcts config ./config

# Build the application
RUN yarn build:prod && \
    rm -rf webpack/ webpack.config.js

# ---- Runtime image ----
FROM base AS runtime

WORKDIR /app
# Ensure hmcts user owns the /app directory in runtime stage
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

COPY --from=dependencies /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=dependencies /app/.yarn ./.yarn
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/src/main ./src/main

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3209