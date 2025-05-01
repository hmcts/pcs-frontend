#!/bin/bash
## Usage: ./createIdamUser.sh roles email [password] [surname] [forename]
##
## Options:
##    - role: Comma-separated list of roles. Roles must exist in IDAM (i.e `caseworker-probate,caseworker-probate-solicitor`)
##    - email: Email address
##    - accessToken: Access token returned from https://idam-web-public.aat.platform.hmcts.net/o/token
##    - password: User's password. Default to `Pa55w0rd`. Weak passwords that do not match the password criteria by SIDAM will cause use creation to fail, and such failure may not be expressly communicated to the user.
##    - surname: Last name. Default to `Test`.
##    - forename: First name. Default to `User`.
##
## Create an IDAM user with the role `citizen` or any other role provided in 'roles' option
source ./scripts/get_secrets.sh
export $(grep -v '^#' .env | xargs)

response=$(curl --location 'https://idam-api.aat.platform.hmcts.net/o/token' \
           --header 'Content-Type: application/x-www-form-urlencoded' \
           --data-urlencode 'grant_type=client_credentials' \
           --data-urlencode 'client_id=pcs-frontend' \
           --data-urlencode 'client_secret='${IDAM_SECRET}'' \
           --data-urlencode 'scope=profile roles')
response=${response#*:\"}
accessToken=${response%%\"*}

rolesStr=$1
email=$2
password=${4:-Pa$$w0rd}
surname=${5:-Test}
forename=${6:-User}

if [ -z "$rolesStr" ]
  then
    echo "Usage: ./createIdamUser.sh roles email [password] [surname] [forename]"
    exit 1
fi

IFS=',' read -ra roles <<< "$rolesStr"

# Build roles JSON array
rolesJson="["
firstRole=true
for i in "${roles[@]}"; do
  if [ "$firstRole" = false ] ; then
    rolesJson="${rolesJson},"
  fi
  rolesJson=''${rolesJson}'{"code":"'${i}'"}'
  firstRole=false
done
rolesJson="${rolesJson}]"

echo "Creating an IDAM user $email"

curl -L -X POST 'https://idam-testing-support-api.aat.platform.hmcts.net/test/idam/users' \
-H 'Authorization: Bearer '${accessToken} \
-H 'Content-Type: application/json' \
--data-raw '{
    "password": "'${password}'",
    "user": {
        "email":"'${email}'",
        "forename":"'${forename}'",
        "surname":"'${surname}'",
        "roleNames": [
            "'${rolesStr}'"
        ]
    }
}'
