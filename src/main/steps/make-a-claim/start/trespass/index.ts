import { yesNoQuestion } from '../../fieldBuilders';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'trespass',
  stepDir: __dirname,
  fields: [
    {
      ...yesNoQuestion('isTrespass'),
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
