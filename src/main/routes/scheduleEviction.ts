import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { Application, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { SCHEDULE_EVICTION_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import { refusalPage } from '@utils/orderCase';
import {
  NEW_ANSWERS,
  type ScheduleEvictionSession,
  type ScheduleEvictionStart,
  displayDateTime,
  evictionDateTime,
  evictionErrors,
  postedAnswers,
  requestDateTime,
} from '@utils/scheduleEviction';
import { errorSummary, manageCaseDetailsUrl, refusedXuiEvent, xuiHeaderModel } from '@utils/xuiUtils';

/*
 * The Schedule eviction event, reached from XUI. The start page starts the event and keeps it on the session;
 * check your answers submits it with the start's token.
 */

const EVENT_ID = 'ext:scheduleEviction';
// The answers list on check your answers, which its errors link to.
const ANSWERS_ID = 'schedule-eviction-answers';

const PAGES = {
  start: '',
  evictionDetails: '/eviction-details',
  checkYourAnswers: '/check-your-answers',
  cancel: '/cancel',
  confirmed: '/confirmed',
};

const route = (page: keyof typeof PAGES) => SCHEDULE_EVICTION_ROUTE + PAGES[page];
const pageUrl = (req: Request, page: keyof typeof PAGES) =>
  route(page).replace(':caseReference', req.params.caseReference as string);

function evictionOf(req: Request): ScheduleEvictionSession | undefined {
  return req.session.scheduleEvictions?.[req.params.caseReference as string];
}

const inProgress: RequestHandler = (req, res, next) => {
  const eviction = evictionOf(req);
  return eviction && !eviction.scheduledFor ? next() : res.redirect(pageUrl(req, 'start'));
};

const journey = [oidcMiddleware];
const inJourney = [...journey, inProgress];

function pageModel(req: Request, eviction: ScheduleEvictionSession) {
  return {
    headerModel: xuiHeaderModel(req),
    footerModel: buildFooterModel(),
    formAction: req.originalUrl,
    cancelUrl: pageUrl(req, 'cancel'),
    ...eviction.start,
  };
}

function checkYourAnswersModel(req: Request, eviction: ScheduleEvictionSession) {
  return {
    ...pageModel(req, eviction),
    dispenseWithService: eviction.answers.dispenseWithService === 'YES' ? 'Yes' : 'No',
    scheduledEviction: displayDateTime(evictionDateTime(eviction.answers)!),
    changeUrl: pageUrl(req, 'evictionDetails'),
  };
}

export default function scheduleEvictionRoutes(app: Application): void {
  app.get(route('start'), ...journey, async (req: Request, res: Response, next) => {
    const caseReference = req.params.caseReference as string;
    try {
      const started = await ccdCaseService.startCaseEvent(req.session.user!.accessToken, caseReference, EVENT_ID);
      if (!started.data.sdkEventPayload) {
        // CCD only gives the payload to users allowed to use the event.
        throw new HTTPError('Not permitted to schedule an eviction on this case', 403);
      }
      req.session.scheduleEvictions = {
        ...req.session.scheduleEvictions,
        [caseReference]: {
          start: JSON.parse(started.data.sdkEventPayload as string) as ScheduleEvictionStart,
          eventToken: started.eventToken,
          answers: { ...NEW_ANSWERS },
        },
      };
      res.redirect(pageUrl(req, 'evictionDetails'));
    } catch (error) {
      refusedXuiEvent(res, next, error, refusalPage(req, res));
    }
  });

  app.get(route('cancel'), ...journey, (req: Request, res: Response) => {
    delete req.session.scheduleEvictions?.[req.params.caseReference as string];
    res.redirect(manageCaseDetailsUrl(req.params.caseReference as string));
  });

  app.get(route('evictionDetails'), ...inJourney, (req: Request, res: Response) => {
    const eviction = evictionOf(req)!;
    res.render('schedule-eviction/eviction-details', { ...pageModel(req, eviction), answers: eviction.answers });
  });

  app.post(route('evictionDetails'), ...inJourney, (req: Request, res: Response) => {
    const eviction = evictionOf(req)!;
    eviction.answers = postedAnswers(req.body);
    const errors = evictionErrors(eviction.answers);
    if (errors) {
      return res.status(400).render('schedule-eviction/eviction-details', {
        ...pageModel(req, eviction),
        answers: eviction.answers,
        errors,
        errorSummary: errorSummary([{ id: 'eviction-date-day', message: errors.date }]),
      });
    }
    res.redirect(pageUrl(req, 'checkYourAnswers'));
  });

  app.get(route('checkYourAnswers'), ...inJourney, (req: Request, res: Response) => {
    const eviction = evictionOf(req)!;
    if (evictionErrors(eviction.answers)) {
      return res.redirect(pageUrl(req, 'evictionDetails'));
    }
    res.render('schedule-eviction/check-your-answers', checkYourAnswersModel(req, eviction));
  });

  app.post(route('checkYourAnswers'), ...inJourney, async (req: Request, res: Response, next) => {
    const eviction = evictionOf(req)!;
    if (req.body.action === 'previous') {
      return res.redirect(pageUrl(req, 'evictionDetails'));
    }
    // The date may have passed while the bailiff was on this page.
    const errors = evictionErrors(eviction.answers);
    if (errors) {
      return res.status(400).render('schedule-eviction/check-your-answers', {
        ...checkYourAnswersModel(req, eviction),
        errorSummary: errorSummary([{ id: ANSWERS_ID, message: errors.date }]),
      });
    }
    const dateTime = evictionDateTime(eviction.answers)!;
    try {
      await ccdCaseService.submitCaseEvent(
        req.session.user!.accessToken,
        req.params.caseReference as string,
        EVENT_ID,
        eviction.eventToken,
        {
          sdkEventPayload: JSON.stringify({
            enforcementApplicationId: eviction.start.enforcementApplicationId,
            courtGivenPermissionToDispenseWithService: eviction.answers.dispenseWithService,
            scheduledEvictionDate: requestDateTime(dateTime),
          }),
        }
      );
      eviction.scheduledFor = displayDateTime(dateTime);
      res.redirect(pageUrl(req, 'confirmed'));
    } catch (error) {
      // pcs-api's reasons are shown on this page, so the bailiff can change their answers.
      refusedXuiEvent(res, next, error, rejected =>
        res.status(rejected.status).render('schedule-eviction/check-your-answers', {
          ...checkYourAnswersModel(req, eviction),
          errorSummary: errorSummary(rejected.reasons.map(message => ({ id: ANSWERS_ID, message }))),
        })
      );
    }
  });

  app.get(route('confirmed'), ...journey, (req: Request, res: Response) => {
    const eviction = evictionOf(req);
    const closeUrl = manageCaseDetailsUrl(req.params.caseReference as string);
    if (!eviction?.scheduledFor) {
      return res.redirect(closeUrl);
    }
    res.render('schedule-eviction/confirmation', {
      ...pageModel(req, eviction),
      title: `Eviction date scheduled for ${eviction.scheduledFor}`,
      caseFileViewUrl: `${closeUrl}#Case%20File%20View`,
      closeUrl,
    });
  });
}
