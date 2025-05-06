#!/bin/bash
## Usage: ./createIdamUser.sh --roles=ROLES --email=EMAIL [--surname=SURNAME] [--forename=NAME]
##
## Options:
##    --role: Comma-separated list of roles. Roles must exist in IDAM (i.e citizen,caseworker)
##    --email: Email address
##    --[surname]: Optional Last name. Defaults to `Test`.
##    --[forename]: Optional First name. Defaults to `User`.
## Note: an auto-generated password will be output when the script runs.
## Create an IDAM user with the role `citizen` or any other role provided in 'roles' option

KEY_VAULT_NAME="pcs-aat"
idam_system_user_name=$(az keyvault secret show --name "idam-system-user-name" --vault-name "$KEY_VAULT_NAME" --query "value" -o tsv)
idam_system_user_password=$(az keyvault secret show --name "idam-system-user-password" --vault-name "$KEY_VAULT_NAME" --query "value" -o tsv)
pcs_frontend_idam_secret=$(az keyvault secret show --name "pcs-frontend-idam-secret" --vault-name "$KEY_VAULT_NAME" --query "value" -o tsv)

response=$(curl --location 'https://idam-api.aat.platform.hmcts.net/o/token' \
           --header 'Content-Type: application/x-www-form-urlencoded' \
           --data-urlencode 'username='${idam_system_user_name}'' \
           --data-urlencode 'password='${idam_system_user_password}'' \
           --data-urlencode 'grant_type=password' \
           --data-urlencode 'client_id=pcs-frontend' \
           --data-urlencode 'client_secret='${pcs_frontend_idam_secret}'' \
           --data-urlencode 'scope=profile openid roles')
accessToken=$(echo "$response" | jq -r .access_token)

rolesStr=$1
email=$2
surname=${3:-Test}
forename=${4:-User}
password="Pa$$word"

for arg in "$@"; do
    case "$arg" in
        --roles|-r=*) rolesStr="${arg#*=}";;
        --email|-e=*) email="${arg#*=}";;
        --surname|-s=*) surname="${arg#*=}";;
        --forename|-f=*) forename="${arg#*=}";;
    esac
done

if [ -z "$rolesStr" ] || [ -z "$email" ]; then
    echo "Error: --roles and --email are required"
    echo "Usage: ./createIdamUser.sh --roles=ROLES --email=EMAIL [--surname=SURNAME] [--forename=NAME]"
    exit 1
fi

IFS=',' read -ra roles <<< "$rolesStr"

# Build roles JSON array
firstRole=true
for i in "${roles[@]}"; do
  if [ "$firstRole" = false ] ; then
    rolesJson="${rolesJson},"
  fi
  rolesJson=''${rolesJson}'"'${i}'"'
  firstRole=false
done
rolesJson="${rolesJson}"

echo "Creating IDAM user account for: $email"
echo "Temporary password set for $email: $password"
echo "Roles requested are $rolesJson"

curl -L -X POST 'https://idam-testing-support-api.aat.platform.hmcts.net/test/idam/users' \
-H 'Authorization: Bearer '${accessToken} \
-H 'Content-Type: application/json' \
--data-raw '{
    "password": "'${password}'",
    "user": {
        "email":"'${email}'",
        "forename":"'${forename}'",
        "surname":"'${surname}'",
        "roleNames": ['${rolesJson}']
    }
}'
