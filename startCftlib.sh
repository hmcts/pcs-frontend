#!/usr/bin/env bash
set -euo pipefail

# Run pcs-frontend against a local cftlib bootWithCCD stack.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PCS_API_URL=${PCS_API_URL:-http://localhost:3206}
CCD_URL=${CCD_URL:-http://localhost:4452}
S2S_URL=${S2S_URL:-http://localhost:8489}
OIDC_ISSUER=${OIDC_ISSUER:-http://localhost:5062/o}
OIDC_CLIENT_ID=${OIDC_CLIENT_ID:-pcs-frontend}
OIDC_REDIRECT_URI=${OIDC_REDIRECT_URI:-http://localhost:3209/oauth2/callback}
IDAM_SYSTEM_USERNAME=${IDAM_SYSTEM_USERNAME:-pcs-system-user@localhost}
IDAM_SYSTEM_PASSWORD=${IDAM_SYSTEM_PASSWORD:-password}
PCS_FRONTEND_IDAM_SECRET=${PCS_FRONTEND_IDAM_SECRET:-dummy-frontend-secret}
OS_CLIENT_LOOKUP_SECRET=${OS_CLIENT_LOOKUP_SECRET:-dummy-os-secret}
S2S_SECRET=${S2S_SECRET:-JBSWY3DPEHPK3PXP}
REDIS_CONNECTION_STRING=${REDIS_CONNECTION_STRING:-redis://localhost:6379}

NODE_CONFIG=$(cat <<JSON
{
  "node-env": "development",
  "api": { "url": "${PCS_API_URL}" },
  "ccd": { "url": "${CCD_URL}", "caseTypeId": "PCS" },
  "s2s": { "url": "${S2S_URL}" }
}
JSON
)

if [ ! -d node_modules ]; then
  yarn install
fi

PCS_FRONTEND_IDAM_SECRET="$PCS_FRONTEND_IDAM_SECRET" \
S2S_SECRET="$S2S_SECRET" \
OS_CLIENT_LOOKUP_SECRET="$OS_CLIENT_LOOKUP_SECRET" \
IDAM_SYSTEM_USERNAME="$IDAM_SYSTEM_USERNAME" \
IDAM_SYSTEM_PASSWORD="$IDAM_SYSTEM_PASSWORD" \
OIDC_ISSUER="$OIDC_ISSUER" \
OIDC_CLIENT_ID="$OIDC_CLIENT_ID" \
OIDC_REDIRECT_URI="$OIDC_REDIRECT_URI" \
REDIS_CONNECTION_STRING="$REDIS_CONNECTION_STRING" \
NODE_CONFIG="$NODE_CONFIG" \
yarn start:dev
