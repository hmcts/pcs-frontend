#!/usr/bin/env bash
# saucectl wrappers: direct | tunnel (set SAUCE_TUNNEL_NAME) | tunnel-proxy (also exports HTTP_PROXY etc. for saucectl; ./sc -x is separate)
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
    exec "${SAUCECTL[@]}" "${EXTRA[@]}" "$@"
    ;;
  tunnel-proxy)
    if [[ -z "${SAUCE_TUNNEL_NAME:-}" ]]; then
      echo "ERROR: Set SAUCE_TUNNEL_NAME to your running Sauce Connect tunnel name." >&2
      exit 1
    fi
    # For saucectl only; Sauce Connect proxy is configured on ./sc, not here.
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
