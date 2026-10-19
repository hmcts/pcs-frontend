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
  refusedByCcd,
  xuiHeaderModel,
} from '@utils/orderCase';

const MAKE_ORDER_EVENT_ID = 'ext:makeOrder';

/** The make order event as CCD started it: the page's data, and the token to submit a change to it with. */
interface StartedOrder {
  envelope: OrderStart;
  eventToken: string;
}

async function startOrderEvent(accessToken: string, caseReference: string): Promise<StartedOrder> {
  const started = await ccdCaseService.startCaseEvent(accessToken, caseReference, MAKE_ORDER_EVENT_ID);
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
    // The case as the event started it, which the page's change is based on.
    caseContextJson: JSON.stringify(caseContext),
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

export default function makeOrderRoutes(app: Application): void {
  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, makeOrderFeatureMiddleware, async (req: Request, res: Response, next) => {
    try {
      // A new order on the case is under way, so there is no longer one to confirm.
      delete req.session.ordersSentForReview?.[req.params.caseReference as string];
      const started = await startOrderEvent(req.session.user!.accessToken, req.params.caseReference as string);
      res.render('make-order', pageModel(req, started));
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
    const { _csrf, action, eventToken, caseContext, orderId, orderVersion, orderType, orderDocument, ...formData } =
      req.body;

    try {
      if (action === 'SUBMIT_FOR_REVIEW') {
        // The order is checked against the case as the page's start returned it.
        const started: StartedOrder = {
          eventToken,
          envelope: { order: { id: orderId, version: Number(orderVersion) }, caseContext: JSON.parse(caseContext) },
        };
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
          id: orderId || null,
          version: Number(orderVersion),
          orderType,
          formData,
          docweaveSnapshot: JSON.parse(orderDocument || 'null'),
        },
      };
      try {
        await ccdCaseService.submitCaseEvent(accessToken, MAKE_ORDER_EVENT_ID, eventToken, {
          id: caseReference,
          data: { sdkEventPayload: JSON.stringify(request) },
        });
      } catch (error) {
        if (!(error instanceof CallbackRejectedError)) {
          throw error;
        }
        // pcs-api refused the change, e.g. because the draft was saved or sent for review in another
        // tab: show the judge the order as it now stands, and why.
        const current = await startOrderEvent(accessToken, caseReference);
        const reasons = error.reasons.map(message => ({ id: 'make-order-form', message }));
        return res.status(error.status).render('make-order', pageModel(req, current, { validationIssues: reasons }));
      }
      if (action === 'SUBMIT_FOR_REVIEW') {
        // Kept on the session so the confirmation survives a refresh, which cannot resubmit the order.
        req.session.ordersSentForReview = {
          ...req.session.ordersSentForReview,
          [caseReference]: confirmationHeader(caseReference, JSON.parse(caseContext)),
        };
        return res.redirect(MAKE_ORDER_SENT_FOR_REVIEW_ROUTE.replace(':caseReference', caseReference));
      }
      return res.redirect(manageCaseDetailsUrl(caseReference));
    } catch (error) {
      if (refusedByCcd(error)) {
        return res.status(404).send('Not Found');
      }
      return next(error);
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
