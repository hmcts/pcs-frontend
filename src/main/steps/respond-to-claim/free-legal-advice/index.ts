import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFreeLegalAdviceBase} from '../../common/freeLegalAdviceBase';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFreeLegalAdviceBase({
  flowConfig,
  customTemplate: `${__dirname}/freeLegalAdvice.njk`,
});
