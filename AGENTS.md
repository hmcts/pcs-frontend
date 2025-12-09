## Hosting notes (sandbox)
- Container App `pcs-frontend-demo` in RG `rpx-sandbox`, subscription DCD-CFT-Sandbox (bf308a5c-0624-4334-8ff8-8dca9fd43783), environment `pcs-frontend-demo-env`, region UK South.
- Image: `hmctssandbox.azurecr.io/alexmc/pcs-frontend-demo:demo` (amd64) in ACR `hmctssandbox.azurecr.io` via secret `hmctssandboxazurecrio-hmctssandbox`.
- Ingress: external, target port 3209, FQDN `https://pcs-frontend-demo.proudhill-2e731922.uksouth.azurecontainerapps.io`.
- Scale/profile: min 1 / max 1 replica, Consumption profile (0.5 vCPU / 1Gi memory).
- Env: `NODE_ENV=production` only; logs show LaunchDarkly SDK key invalid when defaults are used.
