import type { Request } from 'express';

import { setFormData } from '../../../../main/modules/steps/formBuilder/helpers';
import { step as suspendStep } from '../../../../main/steps/make-an-application/apply-to-stop-or-delay-the-eviction';
import { step as chooseStep } from '../../../../main/steps/make-an-application/choose-an-application';

import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

jest.mock('../../../../main/modules/steps', () => ({
  ...jest.requireActual('../../../../main/modules/steps'),
  createFormStep: jest.fn(config => config),
}));

const chooseConfig = chooseStep as unknown as FormBuilderConfig;
const suspendConfig = suspendStep as unknown as FormBuilderConfig;

function createReq(generalApplicationsEnabled: boolean | undefined): Request {
  const flags: Record<string, boolean | undefined> = {
    'cui-defendant-general-applications': generalApplicationsEnabled,
  };
  return {
    app: {
      locals: {
        launchDarklyClient: {
          variation: jest.fn(
            async (key: string, _context: unknown, defaultValue: boolean) => flags[key] ?? defaultValue
          ),
        },
      },
    },
    session: {},
    res: {
      locals: {
        step: { journey: 'makeAnApplication' },
        validatedCase: { id: '1111222233334444' },
      },
    },
  } as unknown as Request;
}

describe('suspend application feature flag', () => {
  it.each([
    { generalApplicationsEnabled: true },
    { generalApplicationsEnabled: false },
    { generalApplicationsEnabled: undefined },
  ])(
    'gates suspend visibility and access with general applications=$generalApplicationsEnabled',
    async ({ generalApplicationsEnabled }) => {
      const req = createReq(generalApplicationsEnabled);
      const options = ['SUSPEND', 'ADJOURN', 'SET_ASIDE', 'SOMETHING_ELSE'];
      const formContent: BuiltFormContent = {
        fields: [
          {
            name: 'typeOfApplication',
            type: 'radio',
            component: { items: options.map(value => ({ value })) },
          },
        ],
      };

      await chooseConfig.extendGetContent!(req, formContent);

      expect(formContent.fields[0].component?.items).toEqual(
        (generalApplicationsEnabled ? options : options.slice(1)).map(value => ({ value }))
      );

      setFormData(req, 'choose-an-application', { typeOfApplication: 'SUSPEND' });
      const accessResults = await Promise.allSettled([
        chooseConfig.beforeRedirect!(req),
        suspendConfig.beforeGet!(req),
      ]);
      const rejectedAccess = {
        status: 'rejected',
        reason: expect.objectContaining({
          message: expect.stringContaining('Suspend general applications are not enabled'),
        }),
      };
      const expectedAccess = generalApplicationsEnabled ? { status: 'fulfilled', value: undefined } : rejectedAccess;
      expect(accessResults).toEqual([expectedAccess, expectedAccess]);
    }
  );

  it.each(['ADJOURN', 'SET_ASIDE', 'SOMETHING_ELSE'])(
    'allows %s selections when the general applications flag is off',
    async typeOfApplication => {
      const req = createReq(false);
      setFormData(req, 'choose-an-application', { typeOfApplication });

      await expect(chooseConfig.beforeRedirect!(req)).resolves.toBeUndefined();
    }
  );
});
