// import * as LDClient from '@launchdarkly/node-server-sdk';
import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

//TODO need to add logic to check if defendant name is known from CCD case data
const isDefendantNameKnown = async (req: Request): Promise<boolean> => {
  // const ldClient = (req.app?.locals?.launchDarklyClient as LDClient.LDClient | undefined) ?? undefined;

  // let result = '';
  // try {
  //   const context: LDClient.LDContext = {
  //     kind: 'user',
  //     key: (req.session?.user?.uid as string) ?? 'anonymous',
  //     name: req.session?.user?.name ?? 'anonymous',
  //     email: req.session?.user?.email ?? 'anonymous',
  //     firstName: req.session?.user?.given_name ?? 'anonymous',
  //     lastName: req.session?.user?.family_name ?? 'anonymous',
  //     custom: {
  //       roles: req.session?.user?.roles ?? [],
  //     },
  //   };

  //   // If the flag does not exist LD will return the default (true) so UI remains visible by default.
  //   result = await ldClient?.variation('defendant-name', context, '');

  //   req.session.defendantName = result;
  // } catch (err: unknown) {
  //   // eslint-disable-next-line no-console
  //   console.error('LaunchDarkly evaluation failed', err);
  // }

  // return Promise.resolve(result !== '');
  req.session.defendantName = 'John Smith';
  return Promise.resolve(true);
};

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  stepOrder: [
    'start-now',
    'free-legal-advice',
    'defendant-name-confirmation',
    'defendant-name-capture',
    'defendant-date-of-birth',
    'postcode-finder',
  ],
  steps: {
    'start-now': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      routes: [
        {
          // Route to defendant name confirmation if defendant is known
          condition: async (req: Request) => isDefendantNameKnown(req),
          nextStep: 'defendant-name-confirmation',
        },
        {
          // Route to defendant name capture if defendant is unknown
          condition: async (req: Request) => !isDefendantNameKnown(req),
          nextStep: 'defendant-name-capture',
        },
      ],
      defaultNext: 'defendant-name-capture',
    },
    'defendant-name-confirmation': {
      defaultNext: 'defendant-date-of-birth',
    },
    'defendant-name-capture': {
      defaultNext: 'defendant-date-of-birth',
    },
    'defendant-date-of-birth': {
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      // Last step - no defaultNext
    },
  },
};
