import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { DocWeaveSnapshot } from '@hmcts-cft/docweave';
import config from 'config';
import { Application, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { judgeAccessMiddleware, oidcMiddleware } from '../middleware';
import { getUserRoles } from '../steps/utils';
import { caseNumberFormatter } from '../steps/utils/caseNumberFormatter';
import { buildManageCaseDetailsRedirect } from '../utils/manageCaseRedirect';

import { ccdCaseService } from '@services/ccdCaseService';
import {
  MAKE_ORDER_TYPES,
  type MakeOrderType,
  type MakeOrderValidationIssue,
  validateMakeOrder,
} from '@utils/makeOrderValidation';
import { safeRedirect303 } from '@utils/safeRedirect';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';
const STUBBED_MAKE_ORDER_ROUTE = '/dev/make-order';

type FormData = Record<string, unknown>;

interface MakeOrderParty {
  id: string;
  name: string;
}

interface MakeOrderDraftPayload {
  version: 1;
  orderType: MakeOrderType;
  formData: FormData;
  documents: Partial<Record<MakeOrderType, DocWeaveSnapshot>>;
}

/** The make order event's case field, as the backend stores and returns it. */
interface MakeOrderEnvelope {
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
    caseFacts?: Record<string, unknown>;
  };
}

const emptyDraftPayload = (): MakeOrderDraftPayload => ({
  version: 1,
  orderType: 'OUTRIGHT_POSSESSION',
  formData: {},
  documents: {},
});

async function loadEnvelope(accessToken: string, caseReference: string): Promise<MakeOrderEnvelope> {
  const ccdCase = await ccdCaseService.getCaseByIdForEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID);
  const payload = ccdCase.data.makeOrderPayload;
  if (!payload) {
    throw new HTTPError('The make order event did not return order data', 500);
  }
  return JSON.parse(payload) as MakeOrderEnvelope;
}

function submitOrderEvent(
  accessToken: string,
  caseReference: string,
  action: string,
  order: { id: string | null; version: number; draftPayload: MakeOrderDraftPayload }
): Promise<unknown> {
  return ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, {
    makeOrderPayload: JSON.stringify({ action, order }),
  });
}

async function loadOrStartDraft(accessToken: string, caseReference: string): Promise<MakeOrderEnvelope> {
  const envelope = await loadEnvelope(accessToken, caseReference);
  if (envelope.order.id) {
    return envelope;
  }
  await submitOrderEvent(accessToken, caseReference, 'START_DRAFT', {
    id: null,
    version: 0,
    draftPayload: emptyDraftPayload(),
  });
  return loadEnvelope(accessToken, caseReference);
}

/** Case context addresses arrive with CCD (PascalCase) or JSON (camelCase) keys. */
function formatAddress(address: Record<string, string | undefined> = {}): string {
  return ['addressLine1', 'addressLine2', 'addressLine3', 'postTown', 'county', 'postCode', 'country']
    .map(key => address[key] ?? address[key[0].toUpperCase() + key.slice(1)])
    .filter(Boolean)
    .join(', ');
}

/** Pre-fills the case facts fields from the claim, in the form's field names. */
function caseFactsFormData(caseFacts: Record<string, unknown> = {}): FormData {
  const formData: FormData = {};
  const fields: Record<string, string> = {
    tenancyType: 'tenancy-type',
    currentRent: 'current-rent',
    rentFrequency: 'rent-frequency',
    groundsPleaded: 'grounds-pleaded',
    arrearsOnIssue: 'arrears-issue',
  };
  const dates: Record<string, string> = { tenancyStartDate: 'date-tenancy', noticeDate: 'date-notice' };
  for (const [fact, field] of Object.entries(fields)) {
    if (caseFacts[fact] !== undefined && caseFacts[fact] !== null) {
      formData[field] = String(caseFacts[fact]);
    }
  }
  for (const [fact, field] of Object.entries(dates)) {
    const [year, month, day] = String(caseFacts[fact] ?? '').split('-');
    if (day) {
      Object.assign(formData, { [`${field}-day`]: String(Number(day)), [`${field}-month`]: String(Number(month)) });
      formData[`${field}-year`] = year;
    }
  }
  return formData;
}

function attendanceParties({ caseContext }: MakeOrderEnvelope): Record<string, string>[] {
  const parties = (type: 'claimant' | 'defendant', list: MakeOrderParty[]): Record<string, string>[] =>
    list.map((party, index) => ({
      id: `${type}-${party.id}`,
      partyId: party.id,
      name: party.name,
      label: `${type[0].toUpperCase()}${type.slice(1)} ${index + 1}: ${party.name}`,
      type,
    }));
  return [...parties('claimant', caseContext.claimants), ...parties('defendant', caseContext.defendants)];
}

interface Submission {
  orderType: MakeOrderType;
  formData: FormData;
  orderDocumentJson: string;
  validationIssues: MakeOrderValidationIssue[];
}

function pageModel(req: Request, envelope: MakeOrderEnvelope, submission?: Submission): Record<string, unknown> {
  const headerModel = buildHeaderModel({ xuiBaseUrl: config.get('xui.uri'), user: { roles: getUserRoles(req) } });
  headerModel.assetsPath = '/assets/ui-component-lib';
  const { caseContext } = envelope;
  const draftPayload = envelope.order.draftPayload ?? emptyDraftPayload();
  const draft: FormData = {
    ...caseFactsFormData(caseContext.caseFacts),
    ...(submission?.formData ?? draftPayload.formData),
  };
  const issues = submission?.validationIssues ?? [];
  const orderType = submission?.orderType ?? draftPayload.orderType;

  return {
    headerModel,
    footerModel: buildFooterModel(),
    order: envelope.order,
    draft,
    draftOrderType: orderType,
    orderDocumentJson: submission?.orderDocumentJson ?? JSON.stringify(draftPayload.documents?.[orderType] ?? null),
    draftValue: (name: string): unknown => draft[name],
    draftChecked: (name: string, value: string): boolean => {
      const saved = draft[name];
      return Array.isArray(saved) ? saved.includes(value) : saved === value;
    },
    draftDate: (prefix: string) => ['day', 'month', 'year'].map(name => ({ name, value: draft[`${prefix}-${name}`] })),
    draftSelect: (items: Record<string, unknown>[], name: string, defaultValue?: string) =>
      items.map(item => ({ ...item, selected: item.value === (draft[name] ?? defaultValue) })),
    caseReferenceDisplay: caseNumberFormatter(caseContext.caseReference),
    propertyAddressDisplay: formatAddress(caseContext.propertyAddress),
    claimantNames: caseContext.claimants.map(party => party.name).join(', '),
    defendantNames: caseContext.defendants.map(party => party.name).join(', '),
    attendanceParties: attendanceParties(envelope),
    saved: req.query?.saved === 'true',
    submitted: req.query?.submitted === 'true',
    validationErrors: Object.fromEntries(issues.map(issue => [issue.id, { text: issue.message }])),
    errorSummary: issues.length
      ? {
          titleText: 'There is a problem',
          errorList: issues.map(issue => ({ text: issue.message, href: `#${issue.id}` })),
          attributes: { id: 'make-order-error-summary' },
        }
      : undefined,
  };
}

function stubbedEnvelope(formData: FormData = {}): MakeOrderEnvelope {
  return {
    order: {
      id: 'local-make-order-draft',
      state: 'DRAFT',
      version: 1,
      draftPayload: { ...emptyDraftPayload(), formData },
    },
    caseContext: {
      caseReference: 1777027600017760,
      propertyAddress: { addressLine1: '10 Test Street', postTown: 'Bristol', postCode: 'BS1 1AA' },
      claimants: [{ id: 'claimant-id', name: 'Example Housing' }],
      defendants: [{ id: 'defendant-id', name: 'Alex Example' }],
      caseFacts: { tenancyStartDate: '2024-01-09', noticeDate: '2025-06-12', currentRent: 750, arrearsOnIssue: 2400 },
    },
  };
}

function parseDocument(orderDocument: unknown): DocWeaveSnapshot | undefined {
  if (typeof orderDocument !== 'string' || !orderDocument) {
    return undefined;
  }
  try {
    return JSON.parse(orderDocument) as DocWeaveSnapshot;
  } catch {
    throw new HTTPError('The order document is not valid JSON', 400);
  }
}

export default function makeOrderRoutes(app: Application): void {
  if (process.env.USE_STUBBED_DEPS === 'true') {
    app.get(STUBBED_MAKE_ORDER_ROUTE, (req, res) => res.render('make-order', pageModel(req, stubbedEnvelope())));
    app.post(STUBBED_MAKE_ORDER_ROUTE, (req, res) =>
      res.render('make-order', pageModel(req, stubbedEnvelope(req.body as FormData)))
    );
  }

  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, judgeAccessMiddleware, async (req: Request, res: Response, next) => {
    try {
      const envelope = await loadOrStartDraft(req.session.user!.accessToken, req.params.caseReference as string);
      res.render('make-order', pageModel(req, envelope));
    } catch (error) {
      next(error);
    }
  });

  app.post(MAKE_ORDER_ROUTE, oidcMiddleware, judgeAccessMiddleware, async (req: Request, res: Response, next) => {
    const accessToken = req.session.user!.accessToken;
    const caseReference = req.params.caseReference as string;
    const makeOrderUrl = MAKE_ORDER_ROUTE.replace(':caseReference', caseReference);
    const { _csrf, action = 'START_DRAFT', orderId, orderVersion, orderType, orderDocument, ...formData } = req.body;

    try {
      if (action === 'START_DRAFT') {
        await loadOrStartDraft(accessToken, caseReference);
        return safeRedirect303(res, makeOrderUrl, '/', ['/case/']);
      }
      if (!MAKE_ORDER_TYPES.includes(orderType)) {
        throw new HTTPError('The order type is invalid', 400);
      }
      const validationIssues = action === 'SUBMIT_FOR_REVIEW' ? validateMakeOrder(orderType, formData) : [];
      if (validationIssues.length) {
        const envelope = await loadEnvelope(accessToken, caseReference);
        const orderDocumentJson = typeof orderDocument === 'string' ? orderDocument : '';
        return res
          .status(400)
          .render('make-order', pageModel(req, envelope, { orderType, formData, orderDocumentJson, validationIssues }));
      }
      const document = parseDocument(orderDocument);
      await submitOrderEvent(accessToken, caseReference, action, {
        id: orderId || null,
        version: Number(orderVersion),
        draftPayload: { version: 1, orderType, formData, documents: document ? { [orderType]: document } : {} },
      });
      if (action === 'SAVE_DRAFT' || action === 'SUBMIT_FOR_REVIEW') {
        const manageCaseUrl = buildManageCaseDetailsRedirect(
          config.get('redirects.manageCaseReturnURL'),
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
  });
}
