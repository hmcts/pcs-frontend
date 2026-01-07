import { isEmail, isMobilePhone } from 'validator';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-contact-preferences',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'contactMethod',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'title',
        hint: 'hint',
      },
      options: [
        {
          value: 'email',
          translationKey: 'options.email',
          // Nested conditional field: email address input appears when email is selected
          subFields: {
            emailAddress: {
              name: 'emailAddress',
              type: 'text',
              required: true,
              translationKey: {
                label: 'emailAddressLabel',
                hint: 'emailAddressHint',
              },
              validator: (value: unknown) => isEmail(value as string),
              errorMessage: 'errors.emailAddress',
            },
          },
        },
        {
          value: 'phone',
          translationKey: 'options.phone',
          // Nested conditional field: phone number input appears when phone is selected
          subFields: {
            phoneNumber: {
              name: 'phoneNumber',
              type: 'text',
              required: true,
              translationKey: {
                label: 'phoneNumberLabel',
                hint: 'phoneNumberHint',
              },
              validator: (value: unknown) => isMobilePhone(value as string, ['en-GB', 'en-US']),
              errorMessage: 'errors.phoneNumber',
            },
          },
        },
        {
          value: 'post',
          translationKey: 'options.post',
          // No subFields for post option
        },
        {
          value: 'other',
          translationKey: 'options.other',
          // Nested conditional field: textarea for other contact method details
          subFields: {
            otherDetails: {
              name: 'otherDetails',
              type: 'textarea',
              required: true,
              translationKey: {
                label: 'otherDetailsLabel',
                hint: 'otherDetailsHint',
              },
              maxLength: 500,
              attributes: {
                rows: 4,
              },
            },
          },
        },
      ],
    },
    {
      name: 'preferredTimes',
      type: 'checkbox',
      required: false,
      translationKey: {
        label: 'preferredTimesTitle',
        hint: 'preferredTimesHint',
      },
      options: [
        {
          value: 'morning',
          translationKey: 'preferredTimesOptions.morning',
        },
        {
          value: 'afternoon',
          translationKey: 'preferredTimesOptions.afternoon',
        },
        {
          value: 'evening',
          translationKey: 'preferredTimesOptions.evening',
          // Nested conditional field: specific time input appears when evening is selected
          subFields: {
            eveningTime: {
              name: 'eveningTime',
              type: 'text',
              required: (formData, allData) => {
                // Only required if 'evening' checkbox is selected
                // Check current formData first, then fall back to allData
                const currentData =
                  (formData.preferredTimes as string[]) ||
                  (allData['enter-contact-preferences'] as { preferredTimes?: string[] })?.preferredTimes;
                return (
                  (Array.isArray(currentData) && currentData.includes('evening')) ||
                  String(currentData).includes('evening')
                );
              },
              translationKey: {
                label: 'eveningTimeLabel',
                hint: 'eveningTimeHint',
              },
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              errorMessage: 'Enter a valid time (e.g., 18:30)',
            },
          },
        },
        {
          value: 'anytime',
          translationKey: 'preferredTimesOptions.anytime',
        },
      ],
    },
  ],
});
