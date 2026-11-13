import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { Application, Request, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE, MAKE_ORDER_SENT_FOR_REVIEW_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import {
  type OrderFormSubmission,
  applicationsToDecide,
  attendanceParties,
  caseFactsFromForm,
  hearingRecordChanged,
  madeAtChoice,
  madeAtModel,
  madeAtValue,
  orderFormModel,
  withoutHearingRecord,
  withoutUnchosenNoticeDates,
} from '@utils/makeOrderForm';
import {
  AT_HEARING_ORDER_TYPES,
  type MakeOrderValidationIssue,
  validateHearingRecord,
  validateMakeOrder,
} from '@utils/makeOrderValidation';
import {
  type OrderStart,
  caseHeader,
  confirmationHeader,
  decodeOrderDocument,
  manageCaseDetailsUrl,
  postedSnapshot,
  refusalPage,
  refusedOrderEvent,
  xuiHeaderModel,
} from '@utils/orderCase';
import { applicationDecisions } from '@utils/orderOutcome';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';

/** The make order event as CCD started it: the page's data, and the token to submit a change to it with. */
interface StartedOrder {
  envelope: OrderStart;
  eventToken: string;
}

/**
 * What the page's URL names: an order from the orders tab, the application a task asks the judge to decide, or the
 * hearing the judge's link names.
 */
interface Chosen {
  orderId?: string;
  genAppId?: string;
  hearingId?: string;
  /** The judge's own choice on the page of the hearing the order is made at, or of none. */
  madeAt?: { hearingId?: number };
}

/**
 * Starts the judge's working order, or the order they chose on the case's orders tab: one a
 * caseworker returned to them, which pcs-api starts with the caseworker's query. A new order is
 * made for the hearing the judge's link named, if it named one. A task to decide an application
 * starts the judge's order on that application.
 */
async function startOrderEvent(
  accessToken: string,
  caseReference: string,
  { orderId, hearingId, genAppId, madeAt }: Chosen = {}
): Promise<StartedOrder> {
  const started = await ccdCaseService.startCaseEvent(
    accessToken,
    caseReference,
    MAKE_ORDER_EVENT_ID,
    orderId || hearingId || genAppId || madeAt ? { orderId, hearingId, genAppId, madeAt } : undefined
  );
  const payload = started.data.sdkEventPayload;
  if (!payload) {
    // CCD starts the event for anyone who can see the case, but only shows the payload to users
    // it lets use the event.
    throw new HTTPError('Not permitted to make an order on this case', 403);
  }
  return { envelope: JSON.parse(payload) as OrderStart, eventToken: started.eventToken };
}

/** What the judge sent, shown back with the issues that stopped it; the saved order fills any gaps. */
interface Submission extends OrderFormSubmission {
  validationIssues: MakeOrderValidationIssue[];
  hearingVersion?: string;
}

function pageModel(
  req: Request,
  { envelope, eventToken }: StartedOrder,
  submission?: Submission
): Record<string, unknown> {
  const headerModel = xuiHeaderModel(req, ['judge']);
  const { caseContext, order } = envelope;
  const issues = submission?.validationIssues ?? [];

  return {
    headerModel,
    footerModel: buildFooterModel(),
    // The page's own URL, without the tab fragment the browser would otherwise post back to.
    formAction: req.originalUrl,
    order,
    // The page's start, which its submissions reuse so CCD takes a repeated one, e.g. a double click, as the same.
    eventToken,
    hearingVersion: submission?.hearingVersion ?? String(envelope.hearing?.version ?? ''),
    // The task the judge came from, if a caseworker's query brought them here, which pcs-api closes on resubmission.
    taskId: typeof req.query.taskId === 'string' ? req.query.taskId : '',
    ...orderFormModel(envelope, submission),
    ...madeAtModel(envelope),
    ...caseHeader(caseContext),
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

/**
 * The order the orders tab linked to, or the hearing the judge's link named, which the page's URL keeps for as long
 * as the judge works on the order, with the hearing, or none, the judge chose on the page, if given.
 */
function chosen(req: Request, madeAt?: unknown): Chosen {
  const named = (name: string): string | undefined =>
    typeof req.query[name] === 'string' ? (req.query[name] as string) : undefined;
  return {
    orderId: named('orderId'),
    hearingId: named('hearingId'),
    genAppId: named('genAppId'),
    madeAt: madeAtChoice(madeAt),
  };
}

/** What the judge had on the page when they chose to change when the order is made. */
interface MadeAtChange extends OrderFormSubmission {
  madeAt?: string;
  shownMadeAt?: string;
}

/**
 * Shows the judge's page again with what they sent and why pcs-api refused it, never the saved order in its place:
 * where the first of the given choices pcs-api still starts the order, or else where the order was saved, as when the
 * hearing chosen has since been cancelled. A hearing's facts and notes come back only on the hearing they were
 * written for. The order's id and version stay those the judge worked from, so a change made elsewhere since is
 * refused again rather than overwritten; a page with no order of its own, opened before the judge's draft was saved
 * elsewhere, stays without one, and saves nothing over that draft.
 */
async function showRefused(
  req: Request,
  res: Response,
  error: CallbackRejectedError,
  sent: MadeAtChange,
  tryMadeAt: unknown[]
): Promise<void> {
  const accessToken = req.session.user!.accessToken;
  const caseReference = req.params.caseReference as string;
  let started: StartedOrder | undefined;
  for (const madeAt of [...tryMadeAt, undefined]) {
    try {
      started = await startOrderEvent(accessToken, caseReference, chosen(req, madeAt));
      break;
    } catch (refusal) {
      if (!(refusal instanceof CallbackRejectedError) || madeAt === undefined) {
        throw refusal;
      }
    }
  }
  const { envelope, eventToken } = started!;
  const factsShown = madeAtValue(envelope.hearing) === sent.shownMadeAt;
  const { orderId, orderVersion, hearingVersion } = req.body;
  res.status(error.status).render(
    'make-order',
    pageModel(
      req,
      {
        eventToken,
        envelope: { ...envelope, order: { ...envelope.order, id: orderId, version: Number(orderVersion) } },
      },
      {
        orderType: sent.orderType,
        formData: factsShown ? sent.formData : withoutHearingRecord(sent.formData ?? {}),
        orderDocumentJson: sent.orderDocumentJson,
        hearingVersion: factsShown ? hearingVersion : undefined,
        validationIssues: error.reasons.map(message => ({ id: 'make-order-form', message })),
      }
    )
  );
}

/**
 * Shows the page again for the hearing the judge chose, or for none, with everything they have written so far kept
 * and nothing saved: the order's answers and wording, which then follow the choice. A hearing's facts and notes are
 * that hearing's, so the judge saves or undoes changes to them before choosing another; and possession orders are
 * only made at a hearing.
 */
async function changeMadeAt(
  req: Request,
  res: Response,
  { madeAt, shownMadeAt, orderType, formData = {}, orderDocumentJson }: MadeAtChange
): Promise<void> {
  const accessToken = req.session.user!.accessToken;
  const caseReference = req.params.caseReference as string;
  const { eventToken, orderId, orderVersion, hearingVersion } = req.body;
  const order = (started: StartedOrder) => ({ ...started.envelope.order, id: orderId, version: Number(orderVersion) });
  const sent = { madeAt, shownMadeAt, orderType, formData, orderDocumentJson };
  let shown: StartedOrder;
  try {
    shown = await startOrderEvent(accessToken, caseReference, chosen(req, shownMadeAt));
  } catch (error) {
    if (!(error instanceof CallbackRejectedError)) {
      throw error;
    }
    return showRefused(req, res, error, sent, []);
  }
  const submission = { orderType, formData, orderDocumentJson, hearingVersion };
  const refuse = (message: string) =>
    res.status(400).render(
      'make-order',
      pageModel(
        req,
        { eventToken, envelope: { ...shown.envelope, order: order(shown) } },
        {
          ...submission,
          validationIssues: [{ id: 'made-at', message }],
        }
      )
    );
  const choice = madeAtChoice(madeAt);
  if (!choice) {
    return refuse('Select whether the order is made at a hearing');
  }
  if (madeAt === madeAtValue(shown.envelope.hearing)) {
    return res.render(
      'make-order',
      pageModel(
        req,
        { eventToken, envelope: { ...shown.envelope, order: order(shown) } },
        {
          ...submission,
          validationIssues: [],
        }
      )
    );
  }
  if (shown.envelope.hearing && hearingRecordChanged(shown.envelope.hearing, formData)) {
    return refuse(
      'Save the order as a draft to keep your changes to the case facts and notes for this hearing, or undo them, ' +
        'before choosing when the order is made'
    );
  }
  if (choice.hearingId === undefined && orderType && AT_HEARING_ORDER_TYPES.includes(orderType)) {
    return refuse('Possession orders are only made at a hearing. Choose another type of order first');
  }
  let changed: StartedOrder;
  try {
    changed = await startOrderEvent(accessToken, caseReference, chosen(req, madeAt));
  } catch (error) {
    if (!(error instanceof CallbackRejectedError)) {
      throw error;
    }
    return showRefused(req, res, error, sent, [shownMadeAt]);
  }
  // Changed with another button than its own, nothing was saved or sent, which the judge is told.
  const pressedChange = req.body.action === 'CHANGE_MADE_AT';
  res.status(pressedChange ? 200 : 400).render(
    'make-order',
    // The chosen hearing's facts and notes, never those shown for the last one.
    pageModel(
      req,
      { eventToken, envelope: { ...changed.envelope, order: order(changed) } },
      {
        orderType,
        formData: withoutHearingRecord(formData),
        orderDocumentJson,
        validationIssues: pressedChange
          ? []
          : [{ id: 'made-at', message: 'You changed when the order is made. Check the order, then save or send it' }],
      }
    )
  );
}

/**
 * Discards the judge's saved draft once they have ticked that they want to, as they last saw it: pcs-api keeps it as
 * it was last saved, and it is no longer their draft on the case. Without the tick, or refused by pcs-api, the page
 * comes back with everything the judge had on it.
 */
async function discardDraft(req: Request, res: Response, confirmed: boolean, sent: MadeAtChange): Promise<void> {
  const accessToken = req.session.user!.accessToken;
  const caseReference = req.params.caseReference as string;
  const { eventToken, orderId, orderVersion, hearingVersion } = req.body;
  try {
    if (!confirmed) {
      const started = await startOrderEvent(accessToken, caseReference, chosen(req, sent.shownMadeAt));
      const order = { ...started.envelope.order, id: orderId, version: Number(orderVersion) };
      return res.status(400).render(
        'make-order',
        pageModel(
          req,
          { eventToken, envelope: { ...started.envelope, order } },
          {
            orderType: sent.orderType,
            formData: sent.formData,
            orderDocumentJson: sent.orderDocumentJson,
            hearingVersion,
            validationIssues: [{ id: 'discard-draft', message: 'Tick the box to discard this draft order' }],
          }
        )
      );
    }
    await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, eventToken, {
      sdkEventPayload: JSON.stringify({
        action: 'DISCARD_DRAFT',
        order: { id: orderId || null, version: Number(orderVersion) },
        taskId: null,
        hearing: null,
      }),
    });
  } catch (error) {
    if (!(error instanceof CallbackRejectedError)) {
      throw error;
    }
    return showRefused(req, res, error, sent, [sent.madeAt]);
  }
  res.redirect(manageCaseDetailsUrl(caseReference));
}

export default function makeOrderRoutes(app: Application): void {
  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    try {
      // A new order on the case is under way, so there is no longer one to confirm.
      delete req.session.ordersSentForReview?.[req.params.caseReference as string];
      const started = await startOrderEvent(
        req.session.user!.accessToken,
        req.params.caseReference as string,
        chosen(req)
      );
      res.render('make-order', pageModel(req, started));
    } catch (error) {
      refusedOrderEvent(res, next, error, refusalPage(req, res, ['judge']));
    }
  });

  app.post(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    const accessToken = req.session.user!.accessToken;
    const caseReference = req.params.caseReference as string;
    const {
      _csrf,
      action,
      eventToken,
      orderId,
      taskId,
      orderVersion,
      // The hearing's record goes to pcs-api apart from the order, so a posted one is never the order's.
      hearing: _hearing,
      hearingVersion = '',
      orderType,
      orderDocument: encodedDocument,
      'made-at': madeAt,
      'shown-made-at': shownMadeAt,
      // The judge's tick to discard their draft is about the draft, never one of the order's answers.
      'discard-draft': discardConfirmed,
      ...formData
    } = req.body;
    const orderDocument = decodeOrderDocument(encodedDocument);

    try {
      if (action === 'DISCARD_DRAFT') {
        return await discardDraft(req, res, [discardConfirmed].flat().includes('yes'), {
          madeAt,
          shownMadeAt,
          orderType,
          formData,
          orderDocumentJson: orderDocument,
        });
      }
      if (action === 'CHANGE_MADE_AT' || (madeAt !== undefined && madeAt !== shownMadeAt)) {
        return await changeMadeAt(req, res, {
          madeAt,
          shownMadeAt,
          orderType,
          formData,
          orderDocumentJson: orderDocument,
        });
      }
      // The case comes from a new start rather than the page, which would have to post it as JSON the WAF
      // blocks, and could change it. The event token, order id and version stay the page's: CCD takes a
      // repeated submission as the one already made, and pcs-api refuses the change if the order has moved on.
      const sent = { madeAt, shownMadeAt, orderType, formData, orderDocumentJson: orderDocument };
      let started: StartedOrder;
      try {
        started = await startOrderEvent(accessToken, caseReference, chosen(req, madeAt));
      } catch (error) {
        if (!(error instanceof CallbackRejectedError)) {
          throw error;
        }
        return await showRefused(req, res, error, sent, []);
      }
      const currentHearing = started.envelope.hearing;
      const hearingChanged = !!currentHearing && hearingRecordChanged(currentHearing, formData);
      if (hearingChanged && hearingVersion !== String(currentHearing.version ?? '')) {
        // Reload stale facts rather than silently applying the judge's edits to a newer version, keeping the order
        // as the judge left it.
        const order = { ...started.envelope.order, id: orderId, version: Number(orderVersion) };
        return res.status(409).render(
          'make-order',
          pageModel(
            req,
            { eventToken, envelope: { ...started.envelope, order } },
            {
              orderType,
              formData: withoutHearingRecord(formData),
              orderDocumentJson: orderDocument,
              validationIssues: [
                {
                  id: 'make-order-form',
                  message: 'The hearing facts or notes have changed. Check the reloaded details before saving again.',
                },
              ],
            }
          )
        );
      }
      // Sending checks the whole order; saving a draft checks only the hearing's record, which every save records.
      const validationIssues =
        action === 'SUBMIT_FOR_REVIEW'
          ? validateMakeOrder(
              orderType,
              formData,
              currentHearing ? attendanceParties(started.envelope) : [],
              !currentHearing,
              applicationsToDecide(started.envelope)
            )
          : currentHearing
            ? validateHearingRecord(formData)
            : [];
      if (validationIssues.length) {
        // Nothing was submitted, so keep the token and versions the answers were made against.
        const order = { ...started.envelope.order, id: orderId, version: Number(orderVersion) };
        const submission = { orderType, formData, orderDocumentJson: orderDocument, validationIssues, hearingVersion };
        return res
          .status(400)
          .render('make-order', pageModel(req, { eventToken, envelope: { ...started.envelope, order } }, submission));
      }
      const request = {
        action,
        order: {
          id: orderId || null,
          version: Number(orderVersion),
          orderType,
          formData: withoutHearingRecord(withoutUnchosenNoticeDates(formData)),
          applicationDecisions: applicationDecisions(formData),
          docweaveSnapshot: postedSnapshot(orderDocument),
        },
        taskId: taskId || null,
        // Only send facts and a note when they differ; pcs-api checks the version again when saving.
        hearing: currentHearing
          ? {
              id: currentHearing.id,
              version: currentHearing.version ?? null,
              ...(hearingChanged && {
                caseFacts: caseFactsFromForm(formData),
                note: formData['hearing-notes'] || null,
              }),
            }
          : null,
      };
      try {
        await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, eventToken, {
          sdkEventPayload: JSON.stringify(request),
        });
      } catch (error) {
        if (!(error instanceof CallbackRejectedError)) {
          throw error;
        }
        // pcs-api refused the change, e.g. because the draft was saved or sent for review in another tab, or the
        // hearing chosen was cancelled: show the judge what they sent, and why.
        return await showRefused(req, res, error, sent, [madeAt]);
      }
      if (action === 'SUBMIT_FOR_REVIEW') {
        // Kept on the session so the confirmation survives a refresh, which cannot resubmit the order.
        req.session.ordersSentForReview = {
          ...req.session.ordersSentForReview,
          [caseReference]: confirmationHeader(caseReference, started.envelope.caseContext),
        };
        return res.redirect(MAKE_ORDER_SENT_FOR_REVIEW_ROUTE.replace(':caseReference', caseReference));
      }
      return res.redirect(manageCaseDetailsUrl(caseReference));
    } catch (error) {
      refusedOrderEvent(res, next, error);
    }
  });

  app.get(
    MAKE_ORDER_SENT_FOR_REVIEW_ROUTE,
    oidcMiddleware,
    makeOrderFeatureMiddleware,
    (req: Request, res: Response) => {
      const caseReference = req.params.caseReference as string;
      const closeUrl = manageCaseDetailsUrl(caseReference);
      const sent = req.session.ordersSentForReview?.[caseReference];
      if (!sent) {
        // As in XUI, a confirmation with nothing to confirm returns the user to the case.
        return res.redirect(closeUrl);
      }
      res.render('order-confirmation', {
        headerModel: xuiHeaderModel(req, ['judge']),
        footerModel: buildFooterModel(),
        title: 'Order sent to caseworker for review',
        ...sent,
        whatHappensNext: 'A caseworker will review the order.',
        closeText: 'Close and return to case details',
        closeUrl,
      });
    }
  );
}
