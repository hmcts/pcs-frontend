import type { Request } from 'express';

import { sharedPageContent } from '../formStep';

import { startFlowConfig } from './flow.config';

import { createFormStep, getAllFormData } from '@modules/steps';
import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

type StartStepConfig = Omit<FormBuilderConfig, 'journeyFolder' | 'flowConfig' | 'basePath'> & {
  /** Later pages whose answers only hold for this page's answer, forgotten when it changes. */
  invalidates?: string[];
};

const answerBefore = new WeakMap<Request, string>();

function answerOf(req: Request, config: StartStepConfig): string {
  const answers = getAllFormData(req)[config.stepName] ?? {};
  return JSON.stringify((config.fields ?? []).map(field => answers[field.name]));
}

/** A page asked before the claim exists. Its answers wait in the session until the claim is created. */
export function createStartStep({ invalidates = [], ...config }: StartStepConfig): StepDefinition {
  const step = createFormStep({
    customTemplate: 'make-a-claim/templates/question.njk',
    ...config,
    beforeRedirect: async req => {
      if (answerBefore.has(req) && answerBefore.get(req) !== answerOf(req, config)) {
        const answers = getAllFormData(req);
        invalidates.forEach(stepName => delete answers[stepName]);
      }
      await config.beforeRedirect?.(req);
    },
    extendGetContent: async (req, formContent: BuiltFormContent) => ({
      ...sharedPageContent(req, true),
      dashboardUrl: undefined,
      ...(config.extendGetContent ? await config.extendGetContent(req, formContent) : {}),
    }),
    journeyFolder: 'makeAClaim',
    flowConfig: startFlowConfig,
  });
  const post = step.postController?.post;
  if (!post || invalidates.length === 0) {
    return step;
  }
  return {
    ...step,
    postController: {
      post: (req, res, next) => {
        answerBefore.set(req, answerOf(req, config));
        return post(req, res, next);
      },
    },
  };
}

export function createIneligibleStep(stepName: string, stepDir: string): StepDefinition {
  return createStartStep({
    stepName,
    stepDir,
    fields: [],
    customTemplate: 'make-a-claim/templates/info.njk',
    extendGetContent: () => ({ exitUrl: 'https://www.gov.uk' }),
  });
}
