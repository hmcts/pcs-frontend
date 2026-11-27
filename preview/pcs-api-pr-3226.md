# Frontend preview against pcs-api PR 3226 (do not merge)

This draft PR exists only to run the pcs-frontend journeys against the pcs-api Spring Boot 4
upgrade (HDPI-9529, hmcts/pcs-api#3226) before it reaches AAT.

The `pcs-api-pr:3226` label makes `Jenkinsfile_CNP` point this preview's PCS API, CCD data store,
CDAM and XUI at the `pcs-api-pr-3226` preview stack instead of AAT.

Close this PR and delete the `pcs-api-pr:3226` label once pcs-api#3226 has merged.
