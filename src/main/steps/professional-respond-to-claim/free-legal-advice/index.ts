import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFreeLegalAdviceBase} from '../../common/freeLegalAdviceBase';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFreeLegalAdviceBase({
  flowConfig,
  customTemplate: `${__dirname}/freeLegalAdvice.njk`,
  journeyFolder: 'professionalRespondToClaim',
  translationKeys: {
      pageTitle: 'pageTitle',
      heading: 'heading',
      caption: 'caption',
      subHeading1: 'subHeading1',
      paragraph1: 'paragraph1',
      paragraph2: 'paragraph2',
      bullet1: 'bullet1',
      bullet2: 'bullet2',
      subHeading2: 'subHeading2',
      paragraph3: 'paragraph3',
      paragraph4: 'paragraph4',
  },
});
