#!/usr/bin/env bash
# direct & tunnel: unset HTTP(S)_PROXY/NO_PROXY for saucectl | tunnel-proxy: pass proxy through | ./sc -x is separate
# Tunnel modes: SAUCE_TUNNEL_NAME defaults to reformtunnel (matches cnp-jenkins-library withSauceConnect --tunnel-name).
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

MODE="${1:-}"
shift || true
CONFIG=".sauce/config.yml"
SAUCECTL=(yarn exec saucectl run -c "$CONFIG")
# Default when unset: same as hmcts/cnp-jenkins-library vars/withSauceConnect.groovy
DEFAULT_TUNNEL_NAME=reformtunnel

case "$MODE" in
  direct)
    unset HTTP_PROXY HTTPS_PROXY NO_PROXY
    exec "${SAUCECTL[@]}" "$@"
    ;;
  tunnel)
    TUNNEL_NAME="${SAUCE_TUNNEL_NAME:-$DEFAULT_TUNNEL_NAME}"
    EXTRA=(--tunnel-name "$TUNNEL_NAME")
    if [[ -n "${SAUCE_TUNNEL_OWNER:-}" ]]; then
      EXTRA+=(--tunnel-owner "$SAUCE_TUNNEL_OWNER")
    fi
    unset HTTP_PROXY HTTPS_PROXY NO_PROXY
    exec "${SAUCECTL[@]}" "${EXTRA[@]}" "$@"
    ;;
  tunnel-proxy)
    TUNNEL_NAME="${SAUCE_TUNNEL_NAME:-$DEFAULT_TUNNEL_NAME}"
    if [[ -z "${HTTP_PROXY:-}" && -z "${HTTPS_PROXY:-}" ]]; then
      echo "Note: HTTP_PROXY/HTTPS_PROXY unset — export them before yarn if saucectl needs your corporate proxy (e.g. http://proxyout.reform.hmcts.net:8080)." >&2
    fi
    # For saucectl only; ./sc -x is separate.
    export HTTP_PROXY HTTPS_PROXY NO_PROXY
    EXTRA=(--tunnel-name "$TUNNEL_NAME")
    if [[ -n "${SAUCE_TUNNEL_OWNER:-}" ]]; then
      EXTRA+=(--tunnel-owner "$SAUCE_TUNNEL_OWNER")
    fi
    exec "${SAUCECTL[@]}" "${EXTRA[@]}" "$@"
    ;;
  *)
    echo "Usage: $0 {direct|tunnel|tunnel-proxy} [-- extra saucectl args, e.g. --dry-run]" >&2
    exit 1
    ;;
esac
