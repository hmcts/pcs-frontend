import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { Application, Request, Response } from 'express';

import { RECORD_WARRANT_RETURN_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { CcdCaseData } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { formatAddress } from '@utils/ccdDashboardUtils';
import {
  EvictionOutcome,
  EvictionSuccessfulReturnName,
  EvictionSummaryData,
  EvictionUnsuccessfulReturnName,
  InterimReturnName,
  WarrantReturn,
  WarrantReturnType,
  evictionOutcomeList,
  evictionSuccessfulReturnTypeList,
  evictionUnsuccessfulReturnTypeList,
  formatClaimants,
  formatDefendants,
  interimReturnTypeList,
  isAdditionalDetailsMandatoryEvictionUnsuccessful,
  isAdditionalDetailsMandatoryInterim,
  warrantReturnTypeList,
} from '@utils/warrantReturn';
import {
  ValidationIssue,
  errorSummary,
  getClaimantNames,
  getDefendantNames,
  manageCaseDetailsUrl,
  mapXuiValidation,
  refusedXuiEvent,
  xuiHeaderModel,
} from '@utils/xuiUtils';

const RECORD_WARRANT_RETURN_EVENT_ID: string = 'ext:recordWarrantReturn';

const PAGES = {
  warrantReturn: '',
  checkYourAnswers: '/check-your-answers',
  cancel: '/cancel',
  confirmed: '/confirmed',
} as const;

type Page = keyof typeof PAGES;

const RETURN_NAME_ERROR_MESSAGE: string = 'Return name is required';
const FINAL_OUTCOME_ERROR_MESSAGE: string = 'Final outcome is required';
const ADDITIONAL_DETAILS_ERROR_MESSAGE: string = 'Additional details is required';

const logger = Logger.getLogger('recordWarrantReturn');

function route(page: Page): string {
  return `${RECORD_WARRANT_RETURN_ROUTE}${PAGES[page]}`;
}

function pageUrl(caseReference: string, page: Page): string {
  return route(page).replace(':caseReference', caseReference);
}

function caseReferenceOf(req: Request): string {
  return req.params.caseReference as string;
}

const journey = [oidcMiddleware];

function pageModel(req: Request, issues: ValidationIssue[] = []): Record<string, unknown> {
  const caseReference = caseReferenceOf(req);
  return {
    footerModel: buildFooterModel(),
    formAction: req.originalUrl,
    errorSummary: errorSummary(issues),
    validationErrors: mapXuiValidation(issues),
    cancelUrl: pageUrl(caseReference, 'cancel'),
  };
}

export default function recordWarrantReturnRoutes(app: Application): void {
  app.get(route('warrantReturn'), ...journey, async (req: Request, res: Response, next) => {
    try {
      const caseReference = caseReferenceOf(req);
      const started = await ccdCaseService.startCaseEvent(
        req.session.user!.accessToken,
        caseReference,
        RECORD_WARRANT_RETURN_EVENT_ID,
        {}
      );

      const ccdCase: CcdCaseData = started.data;

      logger.info('claimantType data', ccdCase.claimantType);

      const evictionData: EvictionSummaryData = {
        card: {
          title: {
            text: 'Eviction details',
          },
        },
        rows: [
          {
            key: {
              text: 'Claimant type',
            },
            value: {
              text: 'CLAIMANT TYPE PLACEHOLDER', //ccdCase.claimantType!.value.label
            },
          },
          {
            key: {
              text: 'Claimant name',
            },
            value: {
              text: formatClaimants(ccdCase),
            },
          },
          {
            key: {
              text: 'Defendant(s) name(s)',
            },
            value: {
              html: formatDefendants(ccdCase),
            },
          },
        ],
      };

      res.render('record-warrant-return/warrant-return', {
        ...pageModel(req),
        continueUrl: pageUrl(caseReference, 'checkYourAnswers'),
        warrantReturnTypeList,
        evictionOutcomeList,
        evictionSuccessfulReturnTypeList,
        evictionUnsuccessfulReturnTypeList,
        interimReturnTypeList,
        evictionData,
        propertyAddress: formatAddress(ccdCase.propertyAddress),
        caseReference,
        footerModel: buildFooterModel(),
        headerModel: xuiHeaderModel(req),
        claimantNames: getClaimantNames(ccdCase),
        defendantNames: getDefendantNames(ccdCase),
      });
    } catch (error) {
      refusedXuiEvent(res, next, error);
    }
  });

  app.post(route('warrantReturn'), ...journey, async (req: Request, res: Response, _) => {
    const returnType: WarrantReturnType = req.body.returnType;
    let errors: ValidationIssue[];
    const caseReference = caseReferenceOf(req);

    switch (returnType) {
      case WarrantReturnType.FINAL:
        errors = validateFinalWarrantReturn(req, caseReference);
        break;
      case WarrantReturnType.INTERIM:
        errors = validateInterimWarrantReturn(req, caseReference);
        break;
      default:
        errors = [
          {
            id: 'return-type',
            message: 'Return is required',
          },
        ];
    }

    if (errors.length > 0) {
      res.status(400).render('record-warrant-return/warrant-return', {
        ...pageModel(req, errors),
        continueUrl: pageUrl(caseReference, 'checkYourAnswers'),
        warrantReturnTypeList,
        evictionOutcomeList,
        evictionSuccessfulReturnTypeList,
        evictionUnsuccessfulReturnTypeList,
        interimReturnTypeList,
        footerModel: buildFooterModel(),
        headerModel: xuiHeaderModel(req),
      });
    } else {
      res.redirect(pageUrl(caseReference, 'checkYourAnswers'));
    }
  });

  app.get(route('checkYourAnswers'), ...journey, (req: Request, res: Response) => {
    res.render('record-warrant-return/check-your-answers', {
      ...pageModel(req),
    });
  });

  app.post(route('checkYourAnswers'), async (req: Request, res: Response, _) => {
    const caseReference = caseReferenceOf(req);
    if (req.body.action === 'previous') {
      return res.redirect(pageUrl(caseReference, 'warrantReturn'));
    }
  });

  app.get(route('confirmed'), ...journey, (req: Request, res: Response) => {
    res.render('record-warrant-return/confirmed', {
      ...pageModel(req),
    });
  });

  app.get(route('cancel'), ...journey, (req: Request, res: Response) => {
    res.redirect(manageCaseDetailsUrl(caseReferenceOf(req)));
  });
}

function validateFinalWarrantReturn(req: Request, caseReference: string): ValidationIssue[] {
  const errors: ValidationIssue[] = [];

  const finalOutcome: EvictionOutcome = req.query.finalOutcome as EvictionOutcome;
  switch (finalOutcome) {
    case EvictionOutcome.SUCCESSFUL:
      errors.push(...validateEvictionSuccessful(req, caseReference));
      break;
    case EvictionOutcome.UNSUCCESSFUL:
    case EvictionOutcome.CANCELLED:
      errors.push(...validateEvictionUnsuccessful(req, caseReference, finalOutcome));
      break;
    default:
      errors.push({
        id: 'final-outcome',
        message: FINAL_OUTCOME_ERROR_MESSAGE,
      });
  }

  return errors;
}

function validateEvictionSuccessful(req: Request, caseReference: string): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const returnName: EvictionSuccessfulReturnName = req.body
    .evictionSuccessfulReturnName as EvictionSuccessfulReturnName;
  if (!returnName) {
    errors.push({
      id: 'eviction-successful-return-name',
      message: RETURN_NAME_ERROR_MESSAGE,
    });
  }

  if (errors.length === 0) {
    const warrantReturn: WarrantReturn = {
      returnType: WarrantReturnType.FINAL,
      returnName,
      outcome: EvictionOutcome.SUCCESSFUL,
      additionalDetails: req.body.additionalDetails,
    };
    req.session.warrantReturn = { ...req.session.warrantReturn, [caseReference]: warrantReturn };
  }

  return errors;
}

function validateEvictionUnsuccessful(
  req: Request,
  caseReference: string,
  outcome: EvictionOutcome
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const returnName: EvictionUnsuccessfulReturnName = req.body
    .evictionUnsuccessfulReturnName as EvictionUnsuccessfulReturnName;
  if (!returnName) {
    errors.push({
      id: 'eviction-unsuccessful-return-name',
      message: RETURN_NAME_ERROR_MESSAGE,
    });
  }

  if (isAdditionalDetailsMandatoryEvictionUnsuccessful(returnName) && !req.body.additionalDetails) {
    errors.push({
      id: 'additional-details',
      message: ADDITIONAL_DETAILS_ERROR_MESSAGE,
    });
  }

  if (errors.length === 0) {
    const warrantReturn: WarrantReturn = {
      returnType: WarrantReturnType.FINAL,
      returnName,
      outcome,
      additionalDetails: req.body.additionalDetails,
    };
    req.session.warrantReturn = { ...req.session.warrantReturn, [caseReference]: warrantReturn };
  }
  return errors;
}

function validateInterimWarrantReturn(req: Request, caseReference: string): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const returnName: InterimReturnName = req.body.interimReturnName as InterimReturnName;

  if (!returnName) {
    errors.push({
      id: 'interim-return-name',
      message: RETURN_NAME_ERROR_MESSAGE,
    });
  }

  if (isAdditionalDetailsMandatoryInterim(returnName) && !req.body.additionalDetails) {
    errors.push({
      id: 'additional-details',
      message: ADDITIONAL_DETAILS_ERROR_MESSAGE,
    });
  }

  if (errors.length === 0) {
    const warrantReturn: WarrantReturn = {
      returnType: WarrantReturnType.INTERIM,
      returnName,
      additionalDetails: req.body.additionalDetails,
    };
    req.session.warrantReturn = { ...req.session.warrantReturn, [caseReference]: warrantReturn };
  }
  return errors;
}
