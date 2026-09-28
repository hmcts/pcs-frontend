import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { DocWeaveSnapshot } from '@hmcts-cft/docweave';
import config from 'config';
import { Application, Request, Response } from 'express';
import { DateTime } from 'luxon';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';
import { getUserRoles } from '../steps/utils';
import { caseNumberFormatter } from '../steps/utils/caseNumberFormatter';
import { buildManageCaseDetailsRedirect } from '../utils/manageCaseRedirect';

import { ccdCaseService } from '@services/ccdCaseService';
import {
  type AttendanceParty,
  MAKE_ORDER_TYPES,
  type MakeOrderType,
  type MakeOrderValidationIssue,
  validateMakeOrder,
} from '@utils/makeOrderValidation';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';
const STUBBED_MAKE_ORDER_ROUTE = '/dev/make-order';

type FormData = Record<string, unknown>;

interface MakeOrderParty {
  id: string;
  name: string;
}

/** The judge's order as pcs-api stores it: which order, the form they submitted and the order document. */
interface MakeOrderContent {
  orderType: MakeOrderType;
  formData: FormData;
  docweaveSnapshot: DocWeaveSnapshot | null;
}

/** What the make order event sends when the judge opens it: their working order and the case. */
interface MakeOrderStart {
  order: Partial<MakeOrderContent> & {
    id?: string;
    state: 'DRAFT' | 'SUBMITTED_FOR_REVIEW';
    version: number;
  };
  caseContext: {
    caseReference: number;
    propertyAddress?: Record<string, string | undefined>;
    claimants: MakeOrderParty[];
    defendants: MakeOrderParty[];
    caseFacts?: Record<string, unknown>;
  };
}

const DEFAULT_ORDER_TYPE: MakeOrderType = 'OUTRIGHT_POSSESSION';

async function loadEnvelope(accessToken: string, caseReference: string): Promise<MakeOrderStart> {
  const ccdCase = await ccdCaseService.getCaseByIdForEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID);
  const payload = ccdCase.data.sdkEventPayload;
  if (!payload) {
    // CCD starts the event for anyone who can see the case, but only shows the payload to users
    // it lets use the event.
    throw new HTTPError('Not permitted to make an order on this case', 403);
  }
  return JSON.parse(payload) as MakeOrderStart;
}

/** What the frontend submits when the judge acts on their order. */
interface MakeOrderRequest {
  action: string;
  order: MakeOrderContent & { id: string | null; version: number };
}

function submitOrderEvent(
  accessToken: string,
  caseReference: string,
  action: MakeOrderRequest['action'],
  order: MakeOrderRequest['order']
): Promise<unknown> {
  const request: MakeOrderRequest = { action, order };
  return ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, {
    sdkEventPayload: JSON.stringify(request),
  });
}

async function loadOrStartDraft(accessToken: string, caseReference: string): Promise<MakeOrderStart> {
  const envelope = await loadEnvelope(accessToken, caseReference);
  if (envelope.order.id) {
    return envelope;
  }
  await submitOrderEvent(accessToken, caseReference, 'START_DRAFT', {
    id: null,
    version: 0,
    orderType: DEFAULT_ORDER_TYPE,
    formData: {},
    docweaveSnapshot: null,
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
    const date = DateTime.fromISO(String(caseFacts[fact] ?? ''));
    if (date.isValid) {
      formData[`${field}-day`] = String(date.day);
      formData[`${field}-month`] = String(date.month);
      formData[`${field}-year`] = String(date.year);
    }
  }
  return formData;
}

/** A row of the attendance register. */
interface AttendanceRow extends AttendanceParty {
  partyId: string;
  name: string;
}

function attendanceParties({ caseContext }: MakeOrderStart): AttendanceRow[] {
  const parties = (type: AttendanceParty['type'], list: MakeOrderParty[]): AttendanceRow[] =>
    list.map((party, index) => ({
      id: `${type}-${party.id}`,
      partyId: party.id,
      name: party.name,
      label: `${type[0].toUpperCase()}${type.slice(1)} ${index + 1}: ${party.name}`,
      type,
    }));
  return [...parties('claimant', caseContext.claimants), ...parties('defendant', caseContext.defendants)];
}

/** What the judge sent, shown back with the issues that stopped it; the saved order fills any gaps. */
interface Submission {
  orderType?: MakeOrderType;
  formData?: FormData;
  orderDocumentJson?: string;
  validationIssues: MakeOrderValidationIssue[];
}

function pageModel(req: Request, envelope: MakeOrderStart, submission?: Submission): Record<string, unknown> {
  const headerModel = buildHeaderModel({ xuiBaseUrl: config.get('xui.uri'), user: { roles: getUserRoles(req) } });
  headerModel.assetsPath = '/assets/ui-component-lib';
  const { caseContext } = envelope;
  const { order } = envelope;
  const draft: FormData = {
    ...caseFactsFormData(caseContext.caseFacts),
    ...(submission?.formData ?? order.formData),
  };
  const issues = submission?.validationIssues ?? [];
  const orderType = submission?.orderType ?? order.orderType ?? DEFAULT_ORDER_TYPE;

  return {
    headerModel,
    footerModel: buildFooterModel(),
    order,
    draft,
    draftOrderType: orderType,
    orderDocumentJson: submission?.orderDocumentJson ?? JSON.stringify(order.docweaveSnapshot ?? null),
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

function stubbedEnvelope(formData: FormData = {}): MakeOrderStart {
  return {
    order: {
      id: 'local-make-order-draft',
      state: 'DRAFT',
      version: 1,
      orderType: DEFAULT_ORDER_TYPE,
      formData,
      docweaveSnapshot: null,
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

/**
 * Only judges may make an order, which CCD decides from their role assignments: anyone else is
 * not given the event's payload or allowed to submit it, and is shown the page does not exist.
 */
function refusedByCcd(error: unknown): boolean {
  return error instanceof HTTPError && (error.status === 403 || error.status === 404);
}

export default function makeOrderRoutes(app: Application): void {
  if (process.env.USE_STUBBED_DEPS === 'true') {
    app.get(STUBBED_MAKE_ORDER_ROUTE, (req, res) => res.render('make-order', pageModel(req, stubbedEnvelope())));
    app.post(STUBBED_MAKE_ORDER_ROUTE, (req, res) =>
      res.render('make-order', pageModel(req, stubbedEnvelope(req.body as FormData)))
    );
  }

  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    try {
      const envelope = await loadOrStartDraft(req.session.user!.accessToken, req.params.caseReference as string);
      res.render('make-order', pageModel(req, envelope));
    } catch (error) {
      if (refusedByCcd(error)) {
        return res.status(404).send('Not Found');
      }
      next(error);
    }
  });

  app.post(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    const accessToken = req.session.user!.accessToken;
    const caseReference = req.params.caseReference as string;
    const { _csrf, action, orderId, orderVersion, orderType, orderDocument, ...formData } = req.body;

    try {
      if (action !== 'SAVE_DRAFT' && action !== 'SUBMIT_FOR_REVIEW') {
        throw new HTTPError('The action is invalid', 400);
      }
      if (!MAKE_ORDER_TYPES.includes(orderType)) {
        throw new HTTPError('The order type is invalid', 400);
      }
      if (action === 'SUBMIT_FOR_REVIEW') {
        // Validation needs the case's parties, to check each one's attendance.
        const latest = await loadEnvelope(accessToken, caseReference);
        const validationIssues = validateMakeOrder(orderType, formData, attendanceParties(latest));
        if (validationIssues.length) {
          // Keep the version the judge's answers were made against, so that if the draft was saved
          // elsewhere meanwhile, pcs-api refuses the retry rather than overwriting that save.
          const envelope = { ...latest, order: { ...latest.order, id: orderId, version: Number(orderVersion) } };
          const orderDocumentJson = typeof orderDocument === 'string' ? orderDocument : '';
          return res
            .status(400)
            .render(
              'make-order',
              pageModel(req, envelope, { orderType, formData, orderDocumentJson, validationIssues })
            );
        }
      }
      const document = parseDocument(orderDocument);
      try {
        await submitOrderEvent(accessToken, caseReference, action, {
          id: orderId || null,
          version: Number(orderVersion),
          orderType,
          formData,
          docweaveSnapshot: document ?? null,
        });
      } catch (error) {
        if (!(error instanceof CallbackRejectedError)) {
          throw error;
        }
        // pcs-api refused the change, e.g. because the draft was saved or sent for review in another
        // tab: show the judge the order as it now stands, and why.
        const envelope = await loadOrStartDraft(accessToken, caseReference);
        const reasons = error.reasons.map(message => ({ id: 'make-order-form', message }));
        return res.status(error.status).render('make-order', pageModel(req, envelope, { validationIssues: reasons }));
      }
      const manageCaseUrl = buildManageCaseDetailsRedirect(config.get('redirects.manageCaseReturnURL'), caseReference);
      if (!manageCaseUrl) {
        throw new HTTPError('The Manage Case return URL is not configured', 500);
      }
      return res.redirect(manageCaseUrl);
    } catch (error) {
      if (refusedByCcd(error)) {
        return res.status(404).send('Not Found');
      }
      return next(error);
    }
  });
}
