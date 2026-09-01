import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { OrderEditorDocument } from '@hmcts-cft/docweave';
import config from 'config';
import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { judgeAccessMiddleware, oidcMiddleware } from '../middleware';
import { getUserRoles } from '../steps/utils';
import { caseNumberFormatter } from '../steps/utils/caseNumberFormatter';
import { buildManageCaseDetailsRedirect } from '../utils/manageCaseRedirect';

import { ccdCaseService } from '@services/ccdCaseService';
import { sanitiseCaseReference } from '@utils/caseReference';
import { safeRedirect303 } from '@utils/safeRedirect';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';
const XUI_EVENT_ROUTE = '/cases/:caseReference/event/:eventId';
const STUBBED_MAKE_ORDER_ROUTE = '/dev/make-order';

interface MakeOrderParty {
  id: string;
  name: string;
}

interface MakeOrderCaseFacts {
  tenancyStartDate?: string;
  tenancyType?: string;
  noticeDate?: string;
  currentRent?: number | string;
  rentFrequency?: string;
  groundsPleaded?: string;
  arrearsOnIssue?: number | string;
}

type MakeOrderType =
  'OUTRIGHT_POSSESSION' | 'SUSPENDED_POSSESSION' | 'ADJOURNMENT' | 'STRIKE_OUT_DISMISSAL' | 'FREE_FORM';

interface MakeOrderDraftPayload {
  version: 1;
  orderType: MakeOrderType;
  formData: Record<string, unknown>;
  documents: Partial<Record<MakeOrderType, OrderEditorDocument>>;
}

interface MakeOrderEnvelope {
  action?: 'START_DRAFT' | 'SAVE_DRAFT' | 'SUBMIT_FOR_REVIEW';
  order: {
    id?: string;
    state: 'DRAFT' | 'SUBMITTED_FOR_REVIEW' | 'ISSUED';
    version: number;
    draftPayload: MakeOrderDraftPayload;
  };
  caseContext: {
    caseReference: number;
    propertyAddress?: Record<string, string | undefined>;
    claimants: MakeOrderParty[];
    defendants: MakeOrderParty[];
    caseFacts?: MakeOrderCaseFacts;
  };
}

function emptyDraftPayload(): MakeOrderDraftPayload {
  return { version: 1, orderType: 'OUTRIGHT_POSSESSION', formData: {}, documents: {} };
}

function stubbedMakeOrderEnvelope(formData: Record<string, unknown> = {}): MakeOrderEnvelope {
  return {
    order: {
      id: 'local-make-order-draft',
      state: 'DRAFT',
      version: 1,
      draftPayload: {
        version: 1,
        orderType: 'OUTRIGHT_POSSESSION',
        formData: {
          'outright-options': ['money-judgment'],
          'outright-mj-sections': ['arrears', 'payment-plan'],
          'outright-mj-plan': ['lump', 'instalments'],
          'outright-mj-balance': 'yes',
          'outright-mj-inst-freq': 'monthly',
          ...formData,
        },
        documents: {},
      },
    },
    caseContext: {
      caseReference: 1777027600017760,
      propertyAddress: { addressLine1: '10 Test Street', postTown: 'Bristol', postCode: 'BS1 1AA' },
      claimants: [{ id: 'claimant-id', name: 'Example Housing' }],
      defendants: [{ id: 'defendant-id', name: 'Alex Example' }],
      caseFacts: {
        tenancyStartDate: '2024-01-09',
        tenancyType: 'Assured tenancy',
        noticeDate: '2025-06-12',
        currentRent: 750,
        rentFrequency: 'Monthly',
        groundsPleaded: 'Ground 8, Ground 10',
        arrearsOnIssue: 2400,
      },
    },
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

async function loadOrStartDraft(accessToken: string, caseReference: string): Promise<MakeOrderEnvelope> {
  const envelope = await loadMakeOrderEnvelope(accessToken, caseReference);
  if (envelope.order.id) {
    return envelope;
  }

  await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, {
    makeOrderPayload: JSON.stringify({
      action: 'START_DRAFT',
      order: {
        id: null,
        version: 0,
        draftPayload: emptyDraftPayload(),
      },
    }),
  });
  return loadMakeOrderEnvelope(accessToken, caseReference);
}

function formatAddress(address?: Record<string, string | undefined>): string {
  if (!address) {
    return '';
  }
  const field = (camelCase: string, ccdCase: string): string | undefined => address[camelCase] ?? address[ccdCase];
  return [
    field('addressLine1', 'AddressLine1'),
    field('addressLine2', 'AddressLine2'),
    field('addressLine3', 'AddressLine3'),
    field('postTown', 'PostTown'),
    field('county', 'County'),
    field('postCode', 'PostCode'),
    field('country', 'Country'),
  ]
    .filter(Boolean)
    .join(', ');
}

function caseFactsToFormData(caseFacts?: MakeOrderCaseFacts): Record<string, unknown> {
  if (!caseFacts) {
    return {};
  }

  const formData: Record<string, unknown> = {};
  const addDate = (prefix: string, value?: string): void => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      formData[`${prefix}-day`] = String(Number(match[3]));
      formData[`${prefix}-month`] = String(Number(match[2]));
      formData[`${prefix}-year`] = match[1];
    }
  };
  const addValue = (name: string, value: unknown): void => {
    if (value !== undefined && value !== null) {
      formData[name] = String(value);
    }
  };

  addDate('date-tenancy', caseFacts.tenancyStartDate);
  addDate('date-notice', caseFacts.noticeDate);
  addValue('tenancy-type', caseFacts.tenancyType);
  addValue('current-rent', caseFacts.currentRent);
  addValue('rent-frequency', caseFacts.rentFrequency);
  addValue('grounds-pleaded', caseFacts.groundsPleaded);
  addValue('arrears-issue', caseFacts.arrearsOnIssue);
  return formData;
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
  const draftPayload = envelope.order.draftPayload ?? emptyDraftPayload();
  const draft = {
    ...caseFactsToFormData(envelope.caseContext.caseFacts),
    ...(draftPayload.formData ?? {}),
  };
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
    draftOrderType: draftPayload.orderType,
    orderDocumentJson: JSON.stringify(draftPayload.documents?.OUTRIGHT_POSSESSION ?? null),
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
  if (process.env.USE_STUBBED_DEPS === 'true') {
    app.get(STUBBED_MAKE_ORDER_ROUTE, (req: Request, res: Response) =>
      res.render('make-order', buildPageModel(req, stubbedMakeOrderEnvelope()))
    );
    app.post(STUBBED_MAKE_ORDER_ROUTE, (req: Request, res: Response) =>
      res.render('make-order', buildPageModel(req, stubbedMakeOrderEnvelope(req.body as Record<string, unknown>)))
    );
  }

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
        const expectedSub = typeof req.query.expected_sub === 'string' ? req.query.expected_sub : undefined;
        const signedInUserId = String(user.uid ?? user.id ?? user.sub);
        if (expectedSub && expectedSub !== signedInUserId) {
          throw new HTTPError('The signed-in user does not match the XUI session', 403);
        }

        const envelope = await loadOrStartDraft(accessToken, req.params.caseReference as string);
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

      const caseReference = sanitiseCaseReference(req.params.caseReference as string);
      if (!caseReference) {
        return next(new HTTPError('Invalid case reference format', 404));
      }
      const makeOrderUrl = MAKE_ORDER_ROUTE.replace(':caseReference', caseReference);
      const { _csrf, action, orderId, orderVersion, orderType, orderDocument, ...formData } = req.body as Record<
        string,
        unknown
      >;
      void _csrf;

      try {
        const orderAction = action ?? 'START_DRAFT';
        if (orderAction === 'START_DRAFT') {
          await loadOrStartDraft(accessToken, caseReference);
          return safeRedirect303(res, makeOrderUrl, '/', ['/case/']);
        }
        const selectedOrderType = orderType as MakeOrderType;
        if (orderAction === 'SUBMIT_FOR_REVIEW' && selectedOrderType !== 'OUTRIGHT_POSSESSION') {
          throw new HTTPError('Only outright possession orders can be submitted for review', 400);
        }
        let outrightDocument: OrderEditorDocument | undefined;
        if (typeof orderDocument === 'string' && orderDocument) {
          try {
            outrightDocument = JSON.parse(orderDocument) as OrderEditorDocument;
          } catch {
            throw new HTTPError('The order document is not valid JSON', 400);
          }
        }
        const draftPayload: MakeOrderDraftPayload = {
          version: 1,
          orderType: selectedOrderType,
          formData,
          documents: outrightDocument ? { OUTRIGHT_POSSESSION: outrightDocument } : {},
        };
        await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, {
          makeOrderPayload: JSON.stringify({
            action: orderAction,
            order: {
              id: orderId || null,
              version: Number(orderVersion),
              draftPayload,
            },
          }),
        });
        if (orderAction === 'SAVE_DRAFT' || orderAction === 'SUBMIT_FOR_REVIEW') {
          const manageCaseUrl = buildManageCaseDetailsRedirect(
            config.get<string>('redirects.manageCaseReturnURL'),
            caseReference
          );
          if (!manageCaseUrl) {
            throw new HTTPError('The Manage Case return URL is not configured', 500);
          }
          return res.redirect(manageCaseUrl);
        }
        return safeRedirect303(res, `${makeOrderUrl}?saved=true`, '/', ['/case/']);
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(XUI_EVENT_ROUTE, (req: Request, res: Response, next: NextFunction) => {
    if (req.params.eventId !== MAKE_ORDER_EVENT_ID) {
      return next();
    }

    const expectedSub = typeof req.query.expected_sub === 'string' ? req.query.expected_sub : undefined;
    const caseReference = sanitiseCaseReference(req.params.caseReference as string);
    if (!caseReference) {
      return next(new HTTPError('Invalid case reference format', 404));
    }
    const makeOrderUrl = MAKE_ORDER_ROUTE.replace(':caseReference', caseReference);
    // safeRedirect303 decodes the target once while validating it, so encode the query value for that pass too.
    const query = expectedSub ? `?expected_sub=${encodeURIComponent(encodeURIComponent(expectedSub))}` : '';
    return safeRedirect303(res, `${makeOrderUrl}${query}`, '/', ['/case/']);
  });
}
