# ---- Base image ----
FROM hmctspublic.azurecr.io/base/node:20-alpine AS base

USER root
RUN corepack enable && corepack prepare yarn@4.7.0 --activate
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
RUN yarn set version 4.7.0 && \
    yarn config set nodeLinker node-modules && \
    yarn install

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

# Copy package files
COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./
COPY --chown=hmcts:hmcts .yarn ./.yarn

# Install only production dependencies
ENV NODE_ENV=production
RUN yarn set version 4.7.0 && \
    yarn config set nodeLinker node-modules && \
    yarn workspaces focus --production --all

# Copy only compiled code and necessary assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/main/public ./dist/main/public
COPY --from=build /app/src/main/assets ./dist/main/assets
COPY --from=build /app/config ./config

# Create required directories and copy assets
RUN mkdir -p ./dist/main/public/assets/images && \
    cp ./dist/main/assets/images/favicon.ico ./dist/main/public/assets/images/

# Verify the files in runtime image
RUN echo "Contents of dist directory in runtime:" && \
    ls -la dist && \
    echo "Full directory structure:" && \
    find dist -type f

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3209

# Start with compiled JavaScript file
CMD ["node", "./dist/main/server.js"]