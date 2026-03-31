#!/usr/bin/env bash
# Run saucectl with optional Sauce Connect tunnel and optional HTTP(S) proxy for local traffic.
# Usage (from repo root):
#   yarn test:saucelab              — no tunnel (Sauce VMs only reach public URLs)
#   yarn test:saucelab:tunnel       — use an existing tunnel: set SAUCE_TUNNEL_NAME (and optionally SAUCE_TUNNEL_OWNER)
#   yarn test:saucelab:tunnel-proxy — same as tunnel, plus export HTTP_PROXY/HTTPS_PROXY/NO_PROXY for saucectl (not for ./sc; see comment in tunnel-proxy case).
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
    # Pass through proxy env to saucectl (e.g. corporate proxy). Unrelated to ./sc -X proxy: that only affects the SC process.
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
