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

# ---- Development image ----
FROM dependencies AS development

WORKDIR /app
# Install bash for development
USER root
RUN apk add --no-cache \
    bash=~5
USER hmcts

# Copy all source files
COPY --chown=hmcts:hmcts . .

# Make the SSL generation script executable
USER root
RUN chmod +x /app/bin/generate-ssl-options.sh
USER hmcts

# Set environment variables
ENV NODE_ENV=development

# ---- Runtime image ----
FROM base AS runtime

WORKDIR /app
# Ensure hmcts user owns the /app directory in runtime stage
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

# Copy package files
COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./
COPY --chown=hmcts:hmcts .yarn ./.yarn

# Install only production dependencies
ENV NODE_ENV=production
RUN yarn workspaces focus --production --all

# Copy only compiled code and necessary assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/main/public ./dist/main/public
COPY --from=build /app/src/main/views ./dist/main/views
COPY --from=build /app/src/main/steps ./dist/main/steps
COPY --from=build /app/config ./config

RUN chmod +x /app/dist/main/server.js

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3209
