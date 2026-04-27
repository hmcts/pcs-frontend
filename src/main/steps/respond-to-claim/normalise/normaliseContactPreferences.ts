import type { Normaliser } from './Normaliser';

/**
 * Normalises contact preference dependencies to prevent orphaned sub-question data.
 *
 * **Business Logic:**
 * - preferenceType: EMAIL/POST (main communication method)
 * - contactByPhone/contactByText: secondary notification preferences
 *
 * **Cleanup Rules:**
 * - When preferenceType = POST → clear contactByPhone, contactByText (no electronic notifications)
 * - When preferenceType = EMAIL → preserve contactByPhone, contactByText (valid secondary options)
 * - When preferenceType is not set → clear all electronic contact preferences
 *
 * **Why this matters:**
 * When user switches to POST-only communication, lingering phone/text preferences create
 * inconsistent state since POST means no electronic communication at all.
 */
export const normaliseContactPreferences: Normaliser = response => {
  const preferenceType = response.defendantResponses?.preferenceType;

  // If preferenceType is POST (postal only), clear all electronic contact methods
  if (preferenceType === 'POST') {
    delete response.defendantResponses?.contactByPhone;
    delete response.defendantResponses?.contactByText;
    return;
  }

  // If no preference type set, clear electronic contact preferences for consistency
  if (!preferenceType) {
    delete response.defendantResponses?.contactByPhone;
    delete response.defendantResponses?.contactByText;
  }

  // When preferenceType = EMAIL, contactByPhone/contactByText remain valid as secondary options
};
