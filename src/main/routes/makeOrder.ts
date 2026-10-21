import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { Application, Request, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { MAKE_ORDER_ROUTE, MAKE_ORDER_SENT_FOR_REVIEW_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import { type OrderFormSubmission, attendanceParties, orderFormModel } from '@utils/makeOrderForm';
import { type MakeOrderValidationIssue, validateMakeOrder } from '@utils/makeOrderValidation';
import {
  type OrderStart,
  caseHeader,
  confirmationHeader,
  manageCaseDetailsUrl,
  postedSnapshot,
  refusedOrderEvent,
  xuiHeaderModel,
} from '@utils/orderCase';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';

/** The make order event as CCD started it: the page's data, and the token to submit a change to it with. */
interface StartedOrder {
  envelope: OrderStart;
  eventToken: string;
}

/**
 * Starts the judge's working order, or the order they chose on the case's orders tab: one a
 * caseworker returned to them, which pcs-api starts with the caseworker's query.
 */
async function startOrderEvent(req: Request): Promise<StartedOrder> {
  const caseReference = req.params.caseReference as string;
  const orderId = chosenOrderId(req);
  const started = await ccdCaseService.startCaseEvent(
    req.session.user!.accessToken,
    caseReference,
    MAKE_ORDER_EVENT_ID,
    orderId ? { orderId } : undefined
  );
  const payload = started.data.sdkEventPayload;
  if (!payload) {
    // CCD starts the event for anyone who can see the case, but only shows the payload to users
    // it lets use the event.
    throw new HTTPError('Not permitted to make an order on this case', 403);
  }
  const envelope = JSON.parse(payload) as OrderStart;
  // The case and order the page was started on stay server-side, keyed by its event token: posting the
  // context JSON trips WAF rules and lets the browser tamper with it. The saved answers and document are
  // left out, as the page posts its own. Entries are cleared on submit and otherwise die with the session.
  const { id, version, queryFromCaseworker } = envelope.order;
  req.session.makeOrderStarts = {
    ...req.session.makeOrderStarts,
    [started.eventToken]: {
      caseReference,
      caseContext: envelope.caseContext,
      order: { id, version, queryFromCaseworker },
    },
  };
  return { envelope, eventToken: started.eventToken };
}

/** What the judge sent, shown back with the issues that stopped it; the saved order fills any gaps. */
interface Submission extends OrderFormSubmission {
  validationIssues: MakeOrderValidationIssue[];
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
    eventToken,
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

/** The order the orders tab linked to, which the page's URL names for as long as the judge works on it. */
function chosenOrderId(req: Request): string | undefined {
  return typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
}

export default function makeOrderRoutes(app: Application): void {
  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    try {
      // A new order on the case is under way, so there is no longer one to confirm.
      delete req.session.ordersSentForReview?.[req.params.caseReference as string];
      const started = await startOrderEvent(req);
      res.render('make-order', pageModel(req, started));
    } catch (error) {
      refusedOrderEvent(res, next, error);
    }
  });

  app.post(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    const accessToken = req.session.user!.accessToken;
    const caseReference = req.params.caseReference as string;
    const { _csrf, action, eventToken, taskId, orderType, orderDocument, ...formData } = req.body;

    try {
      const open = req.session.makeOrderStarts?.[eventToken];
      if (!open || open.caseReference !== caseReference) {
        const current = await startOrderEvent(req);
        return res.status(409).render(
          'make-order',
          pageModel(req, current, {
            orderType,
            formData,
            orderDocumentJson: orderDocument,
            validationIssues: [
              { id: 'make-order-form', message: 'This order page has expired. Check your order and try again.' },
            ],
          })
        );
      }
      const started: StartedOrder = { envelope: { caseContext: open.caseContext, order: open.order }, eventToken };
      if (action === 'SUBMIT_FOR_REVIEW') {
        const validationIssues = validateMakeOrder(orderType, formData, attendanceParties(started.envelope));
        if (validationIssues.length) {
          // Nothing was submitted, so the page's start, and the version it gave, still stand: if the
          // draft was saved elsewhere meanwhile, pcs-api refuses the retry rather than overwriting it.
          const submission = { orderType, formData, orderDocumentJson: orderDocument, validationIssues };
          return res.status(400).render('make-order', pageModel(req, started, submission));
        }
      }
      const request = {
        action,
        order: {
          id: started.envelope.order.id || null,
          version: started.envelope.order.version,
          orderType,
          formData,
          docweaveSnapshot: postedSnapshot(orderDocument),
        },
        taskId: taskId || null,
      };
      try {
        await ccdCaseService.submitCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID, started.eventToken, {
          sdkEventPayload: JSON.stringify(request),
        });
      } catch (error) {
        if (!(error instanceof CallbackRejectedError)) {
          throw error;
        }
        // pcs-api refused the change, e.g. because the draft was saved or sent for review in another
        // tab: show the judge the order as it now stands, and why.
        const current = await startOrderEvent(req);
        const reasons = error.reasons.map(message => ({ id: 'make-order-form', message }));
        return res.status(error.status).render('make-order', pageModel(req, current, { validationIssues: reasons }));
      }
      delete req.session.makeOrderStarts?.[eventToken];
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
