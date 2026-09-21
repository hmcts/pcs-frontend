jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: jest.fn(),
}));

import {
  YOUR_SUPPORT_SECTION_ENUM,
  addYourSupportToCompletedSections,
  isYourSupportSectionComplete,
} from '../../../../main/steps/respond-to-claim/yourSupportSection';

describe('yourSupportSection', () => {
  it('maps the section id to the enum value pcs-api stores in completedSections', () => {
    expect(YOUR_SUPPORT_SECTION_ENUM).toBe('YOUR_SUPPORT');
  });

  describe('addYourSupportToCompletedSections', () => {
    it('adds the marker to an empty or missing list', () => {
      expect(addYourSupportToCompletedSections(undefined)).toEqual(['YOUR_SUPPORT']);
      expect(addYourSupportToCompletedSections([])).toEqual(['YOUR_SUPPORT']);
    });

    it('preserves other completed sections and never duplicates the marker', () => {
      expect(addYourSupportToCompletedSections(['PERSONAL_DETAILS'])).toEqual(['PERSONAL_DETAILS', 'YOUR_SUPPORT']);
      expect(addYourSupportToCompletedSections(['PERSONAL_DETAILS', 'YOUR_SUPPORT'])).toEqual([
        'PERSONAL_DETAILS',
        'YOUR_SUPPORT',
      ]);
    });

    it('returns a new array rather than mutating the input', () => {
      const input = ['PERSONAL_DETAILS'] as const;
      const result = addYourSupportToCompletedSections(input);
      expect(result).not.toBe(input);
      expect(input).toEqual(['PERSONAL_DETAILS']);
    });
  });

  describe('isYourSupportSectionComplete', () => {
    it('is false without a response, without defendantResponses, or without the marker', () => {
      expect(isYourSupportSectionComplete(undefined)).toBe(false);
      expect(isYourSupportSectionComplete({})).toBe(false);
      expect(isYourSupportSectionComplete({ defendantResponses: { completedSections: ['PERSONAL_DETAILS'] } })).toBe(
        false
      );
    });

    it('is true once the marker is present', () => {
      expect(isYourSupportSectionComplete({ defendantResponses: { completedSections: ['YOUR_SUPPORT'] } })).toBe(true);
    });
  });
});
