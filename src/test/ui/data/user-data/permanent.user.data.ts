import { resolveIdamPassword } from '../../utils/idamPassword';

export const user = {
  claimantSolicitor: {
    email: 'pcs-solicitor-automation@test.com',
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
    orgName: 'Possession Claim Service Org1',
    email: 'pcs-org1-solicitor2@test.com',
    password: process.env.IDAM_PCS_USER_PASSWORD,
  },
  defendantSolicitor2: {
    orgName: 'Possession Claim Service Org1',
    email: 'pcs-org1-solicitor3@test.com',
    password: process.env.IDAM_PCS_USER_PASSWORD,
  },
  defendantSolicitor3: {
    orgName: 'Possession Claim Service Org',
    email: 'pcs-solicitor2@test.com',
    password: process.env.IDAM_PCS_USER_PASSWORD,
  },
  defendantSolicitor4: {
    orgName: 'Possession Claim Service Org',
    email: 'pcs-solicitor-user@test.com',
    password: process.env.IDAM_PCS_USER_PASSWORD,
  },
};
