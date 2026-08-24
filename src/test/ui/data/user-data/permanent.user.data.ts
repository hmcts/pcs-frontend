import { resolveIdamPassword } from '../../utils/idamPassword';

export const user = {
  claimantSolicitor: {
    email: 'pcs.local.auth1user1@hmcts.net',
    get password() {
      return resolveIdamPassword();
    },
    uid: process.env.PCS_SOLICITOR_AUTOMATION_UID,
  },
  caseworker: {
    email: 'pcs-caseworker@test.com',
    get password() {
      return resolveIdamPassword();
    },
  },
  defendantSolicitor: {
    email: 'pcs.solicitor.orguser3@hmcts.net',
    password: process.env.IDAM_PCS_USER_PASSWORD,
  },
};
