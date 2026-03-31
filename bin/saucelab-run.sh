#!/usr/bin/env bash
# direct | tunnel (no HTTP(S)_PROXY for saucectl) | tunnel-proxy (use exported HTTP_PROXY/HTTPS_PROXY for saucectl; ./sc -x is separate)
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

MODE="${1:-}"
shift || true
CONFIG=".sauce/config.yml"
SAUCECTL=(yarn exec saucectl run -c "$CONFIG")

case "$MODE" in
  direct)
    exec "${SAUCECTL[@]}" "$@"
    ;;
  tunnel)
    if [[ -z "${SAUCE_TUNNEL_NAME:-}" ]]; then
      echo "ERROR: Set SAUCE_TUNNEL_NAME to your running Sauce Connect tunnel name." >&2
      exit 1
    fi
    EXTRA=(--tunnel-name "$SAUCE_TUNNEL_NAME")
    if [[ -n "${SAUCE_TUNNEL_OWNER:-}" ]]; then
      EXTRA+=(--tunnel-owner "$SAUCE_TUNNEL_OWNER")
    fi
    unset HTTP_PROXY HTTPS_PROXY NO_PROXY
    exec "${SAUCECTL[@]}" "${EXTRA[@]}" "$@"
    ;;
  tunnel-proxy)
    if [[ -z "${SAUCE_TUNNEL_NAME:-}" ]]; then
      echo "ERROR: Set SAUCE_TUNNEL_NAME to your running Sauce Connect tunnel name." >&2
      exit 1
    fi
    if [[ -z "${HTTP_PROXY:-}" && -z "${HTTPS_PROXY:-}" ]]; then
      echo "Note: HTTP_PROXY/HTTPS_PROXY unset — export them before yarn if saucectl needs your corporate proxy (e.g. http://proxyout.reform.hmcts.net:8080)." >&2
    fi
    # For saucectl only; ./sc -x is separate.
    export HTTP_PROXY HTTPS_PROXY NO_PROXY
    EXTRA=(--tunnel-name "$SAUCE_TUNNEL_NAME")
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
