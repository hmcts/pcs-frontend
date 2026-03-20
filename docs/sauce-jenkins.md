# Sauce cross-browser: Jenkins vs local

**Pipeline:** `@Jenkinsfile_nightly`

## Jenkins (CNP common library)

| Piece                    | What happens                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **When**                 | Nightly pipeline: **`enableCrossBrowserTest(120)`** in **`Jenkinsfile_nightly`**.                                                                                                                                                                                                                                                                             |
| **Sauce credentials**    | Jenkins **`reform_tunnel`** credential + Sauce plugin → **`SAUCE_USERNAME`** / **`SAUCE_ACCESS_KEY`** on the agent. You do **not** paste Sauce keys into the repo or extra vault entries for Sauce.                                                                                                                                                           |
| **Sauce Connect**        | **`withSauceConnect('reform_tunnel')`** in **`hmcts/cnp-jenkins-library`** starts the tunnel (**`reformtunnel`**, shared pool). You do **not** run **`sc`** yourself on the agent.                                                                                                                                                                            |
| **Tunnel in `saucectl`** | **`runSauceCrossbrowser.ts`** sees Jenkins (`BUILD_TAG` / `JENKINS_URL`) and defaults **`reformtunnel`** + **`SAUCE_USERNAME`** if **`SAUCE_TUNNEL_*`** are unset — aligned with the library.                                                                                                                                                                 |
| **Idam / URL**           | **`loadVaultSecrets`** + **`handleEnvironmentSetting()`** + **`setFunctionalTestEnvVars()`** set **`PCS_FRONTEND_IDAM_SECRET`**, **`IDAM_PCS_USER_PASSWORD`**, **`IDAM_PCS_USER_EMAIL`**, **`TEST_URL`**. **`.sauce/config.yml`** forwards **`SERVICE_AUTH_TOKEN`**, **`S2S_URL`**, **`BEARER_TOKEN`**, and Idam vars onto the VM via **`"$VAR"`** expansion. |

## Local (your machine)

| Piece               | What you do                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sauce Connect**   | Start **`sc`** yourself (same tunnel id you will pass to **`saucectl`**).                                                                                                                             |
| **Tunnel env**      | Export **`SAUCE_TUNNEL_NAME`** and **`SAUCE_TUNNEL_OWNER`** (match **`sc -i`** / Sauce UI). Jenkins defaults do **not** apply when **`BUILD_TAG`** / **`JENKINS_URL`** are unset.                     |
| **Sauce API creds** | Export **`SAUCE_USERNAME`** and **`SAUCE_ACCESS_KEY`** (your Sauce account).                                                                                                                          |
| **Idam / app**      | Export **`PCS_FRONTEND_IDAM_SECRET`**, **`IDAM_PCS_USER_PASSWORD`**, **`IDAM_PCS_USER_EMAIL`** (if using a fixed user), and optionally **`TEST_URL`**. Same vars expand into **`.sauce/config.yml`**. |
| **Run**             | `yarn test:crossbrowser` (with tunnel already up).                                                                                                                                                    |

---

## What runs (both environments)

**`yarn test:crossbrowser`** → **`scripts/crossbrowser/runSauceCrossbrowser.ts`** → **`saucectl run`** (all suites in **`.sauce/config.yml`**). Each suite uses Playwright **`grep: "@nightly"`** (see **`params`** in the YAML). **`testMatch`** limits which spec files run.

## How env reaches the Sauce VM

**`saucectl`** expands **`"$VAR"`** in **`.sauce/config.yml`** from the **current process environment** (Jenkins agent or your shell). No **`saucectl -e`** list in code for Idam.

## S2S

**`runSauceCrossbrowser.ts`** on the **runner host** (same as **Full E2E**):

1. **`ServiceAuthUtils().retrieveToken()`** → **`SERVICE_AUTH_TOKEN`** / **`S2S_URL`**
2. **`IdamUtils().generateIdamToken()`** → **`BEARER_TOKEN`**

Sauce **VMs** often cannot reach HMCTS APIs from **Node** (internal S2S + sometimes Idam DNS). **`.sauce/config.yml`** forwards **`"$SERVICE_AUTH_TOKEN"`**, **`"$S2S_URL"`**, **`"$BEARER_TOKEN"`** to the VM.

**Global setup** skips S2S / Idam HTTP calls when those env vars are already set.

Runner needs **`PCS_FRONTEND_IDAM_SECRET`**, **`IDAM_PCS_USER_PASSWORD`** (and same network/VPN as Full E2E where required).

## Pre-exec timeout (300s)

Sauce applies a **5-minute total limit** for **`preExec`** (see Sauce Playwright YAML docs). A full **`npm install`** can exceed that; **`.sauce/config.yml`** uses **`--no-audit --no-fund --ignore-scripts`** to reduce time. If it still times out, consider a committed **`package-lock.json`** + **`npm ci`**, or ask Platform / Sauce about options.

## Nightly full matrix

- **`.sauce/config.yml`** lists **four suites** (Chrome/Firefox × Windows/macOS). **`sauce.concurrency: 1`** runs them **one after another** (same `saucectl run`).
- **`Jenkinsfile_nightly`** already calls **`enableCrossBrowserTest(120)`** (timeout in **minutes** per CNP). If the job hits the limit with four suites, **raise the number** (e.g. `180`) after checking with Platform.
- **Vault**: **`PCS_FRONTEND_IDAM_SECRET`** and **`IDAM_PCS_USER_PASSWORD`** are loaded. Add **`IDAM_PCS_USER_EMAIL`** to vault + **`loadVaultSecrets`** only if your specs use a **fixed** Idam user (no **`createUser`**). Otherwise **`createUser`** sets email on the VM.

## Artefacts (Jenkins)

- Library **`crossBrowserTest()`**: **`functional-output/crossbrowser/reports/**/\*`**, **`saucePublisher()`\*\*.
- **`afterAlways('crossBrowserTest')`**: **`test-results`**, **`playwright-report`**, **`.sauce`**.
