import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

function calculateAge(dateValue: { day: string; month: string; year: string }): number | null {
  const day = parseInt(dateValue.day, 10);
  const month = parseInt(dateValue.month, 10);
  const year = parseInt(dateValue.year, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
    return null;
  }

  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

export const step: StepDefinition = createFormStep({
  stepName: 'enter-dob',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      translationKey: {
        label: 'question',
      },
      validate: (value: unknown, _formData: Record<string, unknown>, _allData: Record<string, unknown>) => {
        const dateValue = value as { day: string; month: string; year: string };
        const age = calculateAge(dateValue);

        if (age === null) {
          return undefined;
        }

        if (age < 18) {
          return 'errors.dateOfBirth.custom';
        }

        return undefined;
      },
    },
  ],
});
