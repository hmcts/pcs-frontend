# Sauce cross-browser: Jenkins vs local

## Jenkins (CNP common library)

| Piece                    | What happens                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **When**                 | Nightly pipeline: **`enableCrossBrowserTest(120)`** in **`Jenkinsfile_nightly`**.                                                                                                                                                   |
| **Sauce credentials**    | Jenkins **`reform_tunnel`** credential + Sauce plugin → **`SAUCE_USERNAME`** / **`SAUCE_ACCESS_KEY`** on the agent. You do **not** paste Sauce keys into the repo or extra vault entries for Sauce.                                 |
| **Sauce Connect**        | **`withSauceConnect('reform_tunnel')`** in **`hmcts/cnp-jenkins-library`** starts the tunnel (**`reformtunnel`**, shared pool). You do **not** run **`sc`** yourself on the agent.                                                  |
| **Tunnel in `saucectl`** | **`runSauceCrossbrowser.ts`** sees Jenkins (`BUILD_TAG` / `JENKINS_URL`) and defaults **`reformtunnel`** + **`SAUCE_USERNAME`** if **`SAUCE_TUNNEL_*`** are unset — aligned with the library.                                       |
| **Idam / URL**           | **`loadVaultSecrets`** + **`handleEnvironmentSetting()`** set **`PCS_FRONTEND_IDAM_SECRET`**, **`IDAM_PCS_USER_PASSWORD`**, **`TEST_URL`** on the agent. **`.sauce/config.yml`** pulls them onto the VM via **`"$VAR"`** expansion. |

## Local (your machine)

| Piece               | What you do                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sauce Connect**   | Start **`sc`** yourself (same tunnel id you will pass to **`saucectl`**).                                                                                                                          |
| **Tunnel env**      | Export **`SAUCE_TUNNEL_NAME`** and **`SAUCE_TUNNEL_OWNER`** (match **`sc -i`** / Sauce UI). Jenkins defaults do **not** apply when **`BUILD_TAG`** / **`JENKINS_URL`** are unset.                  |
| **Sauce API creds** | Export **`SAUCE_USERNAME`** and **`SAUCE_ACCESS_KEY`** (your Sauce account).                                                                                                                       |
| **Idam / app**      | Export **`PCS_FRONTEND_IDAM_SECRET`**, **`IDAM_PCS_USER_PASSWORD`**, and optionally **`TEST_URL`** (or rely on **`config`**). Same vars are expanded from your shell into **`.sauce/config.yml`**. |
| **Run**             | `yarn test:crossbrowser` (with tunnel already up).                                                                                                                                                 |

---

## What runs (both environments)

**`yarn test:crossbrowser`** → **`scripts/crossbrowser/runSauceCrossbrowser.ts`** → **`saucectl run`** (all suites in **`.sauce/config.yml`**).

## How env reaches the Sauce VM

**`saucectl`** expands **`"$VAR"`** in **`.sauce/config.yml`** from the **current process environment** (Jenkins agent or your shell). No **`saucectl -e`** list in code for Idam.

## S2S

**`S2S_SECRET`** is not passed through **`.sauce/config.yml`**. **`global-setup.config.ts`** uses **`s2SToken.api.data.ts`** and **`ServiceAuthUtils().retrieveToken()`** to set **`SERVICE_AUTH_TOKEN`** (same as local Playwright).

## Pre-exec timeout (300s)

Sauce applies a **5-minute total limit** for **`preExec`** (see Sauce Playwright YAML docs). A full **`npm install`** can exceed that; **`.sauce/config.yml`** uses **`--no-audit --no-fund --ignore-scripts`** to reduce time. If it still times out, consider a committed **`package-lock.json`** + **`npm ci`**, or ask Platform / Sauce about options.

## Artefacts (Jenkins)

- Library **`crossBrowserTest()`**: **`functional-output/crossbrowser/reports/**/\*`**, **`saucePublisher()`\*\*.
- **`afterAlways('crossBrowserTest')`**: **`test-results`**, **`playwright-report`**, **`.sauce`**.
