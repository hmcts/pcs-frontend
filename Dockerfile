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
COPY --chown=hmcts:hmcts hmcts-header-shell-demo-0.0.3.tgz ./hmcts-header-shell-demo-0.0.3.tgz

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
RUN npx tsc

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
COPY --chown=hmcts:hmcts hmcts-header-shell-demo-0.0.3.tgz ./hmcts-header-shell-demo-0.0.3.tgz

# Install only production dependencies
ENV NODE_ENV=production
RUN yarn workspaces focus --production --all

# Copy only compiled code and necessary assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/main/public ./dist/main/public
COPY --from=build /app/src/main/views ./dist/main/views
COPY --from=build /app/config ./config

RUN chmod +x /app/dist/main/server.js

# Default demo environment variables (can be overridden at runtime)
ENV NODE_ENV=production \
    AUTH_DISABLED=true \
    S2S_DISABLED=true \
    REDIS_DISABLED=true \
    PCS_API_URL=http://localhost:3206 \
    CCD_URL=http://localhost:4452 \
    S2S_URL=http://localhost:8489 \
    OIDC_ISSUER=http://localhost:5062/o \
    OIDC_CLIENT_ID=pcs-frontend \
    OIDC_REDIRECT_URI=http://localhost:3209/oauth2/callback \
    IDAM_SYSTEM_USERNAME=pcs-system-user@localhost \
    IDAM_SYSTEM_PASSWORD=password \
    PCS_FRONTEND_IDAM_SECRET=dummy-frontend-secret \
    OS_CLIENT_LOOKUP_SECRET=dummy-os-secret \
    S2S_SECRET=JBSWY3DPEHPK3PXP \
    REDIS_CONNECTION_STRING=redis://localhost:6379

# Expose the application port
EXPOSE 3209

CMD ["node", "dist/main/server.js"]
