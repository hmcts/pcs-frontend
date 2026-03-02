# Hosting (Sandbox)

This app is hosted as an Azure Container App in the DCD-CFT-Sandbox subscription, using the `rpx-sandbox` resource group in UK South. This guide shows how to deploy a new, separate sandbox instance without touching any existing apps.

## Create your own app in the same sandbox RG

Choose a unique suffix for all names to avoid overwriting existing resources.

### 1) Set subscription and variables

```bash
az account set --subscription "DCD-CFT-Sandbox"

RG="rpx-sandbox"
LOCATION="uksouth"
NAME_SUFFIX="YOURNAME-or-TICKET"

APP_NAME="pcs-frontend-${NAME_SUFFIX}"
ENV_NAME="pcs-frontend-env-${NAME_SUFFIX}"
LAW_NAME="pcs-frontend-law-${NAME_SUFFIX}"
ACR_NAME="hmctssandbox"
IMAGE_REPO="pcs-frontend/${NAME_SUFFIX}"
IMAGE_TAG="sandbox"
IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_REPO}:${IMAGE_TAG}"

# Optional: apply expiry tagging to match sandbox policy
EXPIRES_AFTER="2026-05-31"
```

### 2) Build and push the container image to ACR

```bash
az acr login -n "${ACR_NAME}"

docker build --platform linux/amd64 -t "${IMAGE}" .
docker push "${IMAGE}"
```

### 3) Create Log Analytics workspace (for Container Apps logs)

```bash
az monitor log-analytics workspace create \
  --resource-group "${RG}" \
  --workspace-name "${LAW_NAME}" \
  --location "${LOCATION}" \
  --tags application=pcs-frontend builtFrom="https://github.com/hmcts/pcs-frontend" businessArea=CFT environment=sandbox expiresAfter="${EXPIRES_AFTER}"

LAW_ID=$(az monitor log-analytics workspace show -g "${RG}" -n "${LAW_NAME}" --query customerId -o tsv)
LAW_KEY=$(az monitor log-analytics workspace get-shared-keys -g "${RG}" -n "${LAW_NAME}" --query primarySharedKey -o tsv)
```

### 4) Create the Container Apps environment

```bash
az containerapp env create \
  --resource-group "${RG}" \
  --name "${ENV_NAME}" \
  --location "${LOCATION}" \
  --logs-workspace-id "${LAW_ID}" \
  --logs-workspace-key "${LAW_KEY}" \
  --tags application=pcs-frontend builtFrom="https://github.com/hmcts/pcs-frontend" businessArea=CFT environment=sandbox expiresAfter="${EXPIRES_AFTER}"
```

### 5) Create the Container App

```bash
ACR_USER=$(az acr credential show -n "${ACR_NAME}" --query username -o tsv)
ACR_PASS=$(az acr credential show -n "${ACR_NAME}" --query passwords[0].value -o tsv)

az containerapp create \
  --resource-group "${RG}" \
  --name "${APP_NAME}" \
  --environment "${ENV_NAME}" \
  --image "${IMAGE}" \
  --ingress external \
  --target-port 3209 \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-username "${ACR_USER}" \
  --registry-password "${ACR_PASS}" \
  --env-vars NODE_ENV=production \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --tags application=pcs-frontend builtFrom="https://github.com/hmcts/pcs-frontend" businessArea=CFT environment=sandbox expiresAfter="${EXPIRES_AFTER}"
```

### 6) Check the FQDN

```bash
az containerapp show -g "${RG}" -n "${APP_NAME}" --query properties.configuration.ingress.fqdn -o tsv
```

### 7) Update to a new image tag

```bash
NEW_TAG="demo-$(date +%Y%m%d%H%M)"
NEW_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_REPO}:${NEW_TAG}"

docker build --platform linux/amd64 -t "${NEW_IMAGE}" .
docker push "${NEW_IMAGE}"

az containerapp update \
  --resource-group "${RG}" \
  --name "${APP_NAME}" \
  --image "${NEW_IMAGE}"
```

## Notes

- The sandbox policy enforces required tags on many resource types. If a resource update fails with a policy error, add the missing required tags and retry.
