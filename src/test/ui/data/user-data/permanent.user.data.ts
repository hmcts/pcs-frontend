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
};
