# ---- Base image ----
    FROM hmctspublic.azurecr.io/base/node:20-alpine AS base

    USER root
    RUN corepack enable
    USER hmcts
    
    COPY --chown=hmcts:hmcts . .
    
    # ---- Build image ----
    FROM base AS build
    
    RUN yarn install && yarn build:prod && \
        rm -rf webpack/ webpack.config.js
    
    # ---- Runtime image ----
    FROM base AS runtime
    
    COPY --from=build $WORKDIR/src/main ./src/main
    # TODO: expose the right port for your application
    EXPOSE 3209