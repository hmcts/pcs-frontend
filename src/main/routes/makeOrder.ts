import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import config from 'config';
import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { judgeAccessMiddleware, oidcMiddleware } from '../middleware';
import { getUserRoles } from '../steps/utils';
import { caseNumberFormatter } from '../steps/utils/caseNumberFormatter';

import { ccdCaseService } from '@services/ccdCaseService';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';
const XUI_EVENT_ROUTE = '/cases/:caseReference/event/:eventId';

interface MakeOrderParty {
  id: string;
  name: string;
}

interface MakeOrderEnvelope {
  action?: 'START_DRAFT' | 'SAVE_DRAFT' | 'SUBMIT_FOR_REVIEW';
  order: {
    id?: string;
    state: 'DRAFT' | 'SUBMITTED_FOR_REVIEW' | 'ISSUED';
    version: number;
    draftPayload: Record<string, unknown>;
  };
  caseContext: {
    caseReference: number;
    propertyAddress?: Record<string, string | undefined>;
    claimants: MakeOrderParty[];
    defendants: MakeOrderParty[];
  };
}

function parseEnvelope(payload: unknown): MakeOrderEnvelope {
  if (typeof payload !== 'string' || !payload) {
    throw new HTTPError('The make order event did not return order data', 500);
  }
  return JSON.parse(payload) as MakeOrderEnvelope;
}

async function loadMakeOrderEnvelope(accessToken: string, caseReference: string): Promise<MakeOrderEnvelope> {
  const ccdCase = await ccdCaseService.getCaseByIdForEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID);
  return parseEnvelope(ccdCase.data.makeOrderPayload);
}

async function startDraftIfRequired(accessToken: string, caseReference: string): Promise<void> {
  const envelope = await loadMakeOrderEnvelope(accessToken, caseReference);
  if (envelope.order.id) {
    return;
  }

  await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, {
    makeOrderPayload: JSON.stringify({
      action: 'START_DRAFT',
      order: {
        id: null,
        version: 0,
        draftPayload: {},
      },
    }),
  });
}

function formatAddress(address?: Record<string, string | undefined>): string {
  if (!address) {
    return '';
  }
  return [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.postTown,
    address.county,
    address.postCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function buildAttendanceParties(envelope: MakeOrderEnvelope): { id: string; label: string; type: string }[] {
  return [
    ...envelope.caseContext.claimants.map((party, index) => ({
      id: `claimant-${party.id}`,
      label: `Claimant ${index + 1}: ${party.name}`,
      type: 'claimant',
    })),
    ...envelope.caseContext.defendants.map((party, index) => ({
      id: `defendant-${party.id}`,
      label: `Defendant ${index + 1}: ${party.name}`,
      type: 'defendant',
    })),
  ];
}

function buildPageModel(req: Request, envelope: MakeOrderEnvelope): Record<string, unknown> {
  const roles = getUserRoles(req);
  const headerModel = buildHeaderModel({
    xuiBaseUrl: config.get('xui.uri'),
    user: { roles },
  });
  headerModel.assetsPath = '/assets/ui-component-lib';
  const draft = envelope.order.draftPayload ?? {};
  const draftValue = (name: string): unknown => draft[name];
  const draftChecked = (name: string, value: string): boolean => {
    const savedValue = draft[name];
    return Array.isArray(savedValue) ? savedValue.includes(value) : savedValue === value;
  };
  const draftDate = (prefix: string): { name: string; value: unknown }[] =>
    ['day', 'month', 'year'].map(name => ({ name, value: draft[`${prefix}-${name}`] }));
  const draftSelect = (items: Record<string, unknown>[], name: string): Record<string, unknown>[] =>
    items.map(item => ({ ...item, selected: item.value === draft[name] }));

  return {
    headerModel,
    footerModel: buildFooterModel(),
    order: envelope.order,
    draft,
    draftValue,
    draftChecked,
    draftDate,
    draftSelect,
    caseReferenceDisplay: caseNumberFormatter(envelope.caseContext.caseReference),
    propertyAddressDisplay: formatAddress(envelope.caseContext.propertyAddress),
    claimantNames: envelope.caseContext.claimants.map(party => party.name).join(', '),
    defendantNames: envelope.caseContext.defendants.map(party => party.name).join(', '),
    attendanceParties: buildAttendanceParties(envelope),
    saved: req.query.saved === 'true',
    submitted: req.query.submitted === 'true',
  };
}

export default function makeOrderRoutes(app: Application): void {
  app.get(
    MAKE_ORDER_ROUTE,
    oidcMiddleware,
    judgeAccessMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.session?.user;
      const accessToken = user?.accessToken;
      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }

      try {
        const envelope = await loadMakeOrderEnvelope(accessToken, req.params.caseReference as string);
        return res.render('make-order', buildPageModel(req, envelope));
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    MAKE_ORDER_ROUTE,
    oidcMiddleware,
    judgeAccessMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.session?.user;
      const accessToken = user?.accessToken;
      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }

      const caseReference = req.params.caseReference as string;
      const { _csrf, action, orderId, orderVersion, ...draftPayload } = req.body as Record<string, unknown>;
      void _csrf;

      try {
        const orderAction = action ?? 'START_DRAFT';
        if (orderAction === 'START_DRAFT') {
          await startDraftIfRequired(accessToken, caseReference);
          return res.redirect(req.originalUrl.split('?')[0]);
        }
        await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, {
          makeOrderPayload: JSON.stringify({
            action: orderAction,
            order: {
              id: orderId || null,
              version: Number(orderVersion),
              draftPayload: orderAction === 'START_DRAFT' ? {} : draftPayload,
            },
          }),
        });
        const outcome =
          orderAction === 'SUBMIT_FOR_REVIEW' ? '?submitted=true' : orderAction === 'SAVE_DRAFT' ? '?saved=true' : '';
        return res.redirect(`${req.originalUrl.split('?')[0]}${outcome}`);
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    XUI_EVENT_ROUTE,
    oidcMiddleware,
    judgeAccessMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      if (req.params.eventId !== MAKE_ORDER_EVENT_ID) {
        return next();
      }

      const user = req.session?.user;
      const accessToken = user?.accessToken;
      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }

      const expectedSub = typeof req.query.expected_sub === 'string' ? req.query.expected_sub : undefined;
      const signedInUserId = String(user.uid ?? user.id ?? user.sub);
      if (expectedSub && expectedSub !== signedInUserId) {
        return next(new HTTPError('The signed-in user does not match the XUI session', 403));
      }

      const caseReference = req.params.caseReference as string;
      try {
        await startDraftIfRequired(accessToken, caseReference);
        return res.redirect(MAKE_ORDER_ROUTE.replace(':caseReference', caseReference));
      } catch (error) {
        return next(error);
      }
    }
  );
}
