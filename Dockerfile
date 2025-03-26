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
RUN npx tsc --outDir ./dist

# ---- Runtime image ----
FROM base AS runtime

WORKDIR /app
# Ensure hmcts user owns the /app directory in runtime stage
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

# Copy only production dependencies
COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./
COPY --chown=hmcts:hmcts .yarn ./.yarn
RUN yarn install --production --frozen-lockfile

# Copy only compiled code and necessary assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/main/public ./src/main/public
COPY --from=build /app/config ./config

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3209