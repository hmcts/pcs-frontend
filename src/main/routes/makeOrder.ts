import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { Application, Request, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE, MAKE_ORDER_SENT_FOR_REVIEW_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import {
  type OrderFormSubmission,
  attendanceParties,
  caseFactsFromForm,
  hearingRecordChanged,
  orderFormModel,
  withoutHearingRecord,
} from '@utils/makeOrderForm';
import { type MakeOrderValidationIssue, validateHearingRecord, validateMakeOrder } from '@utils/makeOrderValidation';
import {
  type OrderStart,
  caseHeader,
  confirmationHeader,
  manageCaseDetailsUrl,
  postedSnapshot,
  refusalPage,
  refusedOrderEvent,
  xuiHeaderModel,
} from '@utils/orderCase';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';

/** The make order event as CCD started it: the page's data, and the token to submit a change to it with. */
interface StartedOrder {
  envelope: OrderStart;
  eventToken: string;
}

/** What the page's URL names: an order from the orders tab, or the application a task asks the judge to decide. */
interface Chosen {
  orderId?: string;
  genAppId?: string;
  hearingId?: string;
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
  { orderId, hearingId, genAppId }: Chosen = {}
): Promise<StartedOrder> {
  const started = await ccdCaseService.startCaseEvent(
    accessToken,
    caseReference,
    MAKE_ORDER_EVENT_ID,
    orderId || hearingId || genAppId ? { orderId, hearingId, genAppId } : undefined
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
 * as the judge works on the order.
 */
function chosen(req: Request): Chosen {
  const named = (name: string): string | undefined =>
    typeof req.query[name] === 'string' ? (req.query[name] as string) : undefined;
  return { orderId: named('orderId'), hearingId: named('hearingId'), genAppId: named('genAppId') };
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
      genAppId,
      hearing: _hearing,
      hearingVersion = '',
      orderType,
      orderDocument,
      ...formData
    } = req.body;

    try {
      // The case comes from a new start rather than the page, which would have to post it as JSON the WAF
      // blocks, and could change it. The event token, order id and version stay the page's: CCD takes a
      // repeated submission as the one already made, and pcs-api refuses the change if the order has moved on.
      const started = await startOrderEvent(accessToken, caseReference, chosen(req));
      const currentHearing = started.envelope.hearing;
      const hearingChanged = !!currentHearing && hearingRecordChanged(currentHearing, formData);
      if (hearingChanged && hearingVersion !== String(currentHearing.version ?? '')) {
        // Reload stale facts rather than silently applying the judge's edits to a newer version.
        return res.status(409).render(
          'make-order',
          pageModel(req, started, {
            validationIssues: [
              {
                id: 'make-order-form',
                message: 'The hearing facts or notes have changed. Check the reloaded details before saving again.',
              },
            ],
          })
        );
      }
      // Sending checks the whole order; saving a draft checks only the hearing's record, which every save records.
      const validationIssues =
        action === 'SUBMIT_FOR_REVIEW'
          ? validateMakeOrder(orderType, formData, attendanceParties(started.envelope))
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
          formData: withoutHearingRecord(formData),
          docweaveSnapshot: postedSnapshot(orderDocument),
          genAppId: genAppId || null,
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
        // pcs-api refused the change, e.g. because the draft was saved or sent for review in another
        // tab: show the judge the order as it now stands, and why.
        const current = await startOrderEvent(accessToken, caseReference, chosen(req));
        const reasons = error.reasons.map(message => ({ id: 'make-order-form', message }));
        return res.status(error.status).render('make-order', pageModel(req, current, { validationIssues: reasons }));
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
