import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { Application, NextFunction, Request, Response } from 'express';
import { DateTime } from 'luxon';

import { CallbackRejectedError } from '../HttpError';
import { RECORD_WARRANT_RETURN_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';
import { caseNumberFormatter } from '../steps/utils/caseNumberFormatter';

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
  isAdditionalDetailsMandatory,
  warrantReturnTypeList,
} from '@utils/warrantReturn';
import {
  ValidationIssue,
  errorSummary,
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

const RETURN_TYPE_ERROR_MESSAGE: string = 'Return is required';
const RETURN_NAME_ERROR_MESSAGE: string = 'Return name is required';
const FINAL_OUTCOME_ERROR_MESSAGE: string = 'Final outcome is required';
const ADDITIONAL_DETAILS_ERROR_MESSAGE: string = 'Additional details is required';
export const ADDITIONAL_DETAILS_MAX_LENGTH: number = 6800;
const ADDITIONAL_DETAILS_TOO_LONG_ERROR_MESSAGE: string = `Additional details must be ${ADDITIONAL_DETAILS_MAX_LENGTH.toLocaleString('en-GB')} characters or fewer`;

const EVICTION_DATE_ID = 'eviction-date';
const EVICTION_DATE_PARTS = ['day', 'month', 'year', 'hour', 'minute'] as const;
type EvictionDatePart = (typeof EVICTION_DATE_PARTS)[number];
const EVICTION_DATE_ZONE = 'Europe/London';
const EVICTION_DATE_REQUIRED_ERROR_MESSAGE: string = 'Eviction date and time is required';
const EVICTION_DATE_ERROR_MESSAGE: string = 'The data entered is not valid for Eviction date and time';
const EVICTION_DATE_FUTURE_ERROR_MESSAGE: string = 'Eviction date and time must be in the past';

export interface WarrantReturnAnswers {
  returnType: string;
  finalOutcome: string;
  evictionSuccessfulReturnName: string;
  evictionUnsuccessfulReturnName: string;
  interimReturnName: string;
  additionalDetails: string;
  evictionDate: Record<EvictionDatePart, string>;
}

interface ValidationResult {
  issues: ValidationIssue[];
  warrantReturn?: WarrantReturn;
}

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

function evictionSummary(ccdCase: CcdCaseData): EvictionSummaryData {
  return {
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
          text: ccdCase.claimantType?.value.label,
        },
      },
      {
        key: {
          text: 'Claimant name',
        },
        value: {
          html: formatClaimants(ccdCase),
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
}

async function caseModel(req: Request, caseReference: string): Promise<Record<string, unknown>> {
  const started = await ccdCaseService.startCaseEvent(
    req.session.user!.accessToken,
    caseReference,
    RECORD_WARRANT_RETURN_EVENT_ID,
    {}
  );

  const ccdCase: CcdCaseData = started.data;

  return {
    evictionData: evictionSummary(ccdCase),
    caseReferenceDisplay: caseNumberFormatter(caseReference),
    propertyAddressDisplay: formatAddress(ccdCase.propertyAddress),
    caseName: ccdCase.caseNameHmctsInternal,
  };
}

function formModel(
  req: Request,
  answers: WarrantReturnAnswers,
  issues: ValidationIssue[] = []
): Record<string, unknown> {
  return {
    ...pageModel(req, issues),
    continueUrl: pageUrl(caseReferenceOf(req), 'checkYourAnswers'),
    warrantReturnTypeList,
    evictionOutcomeList,
    evictionSuccessfulReturnTypeList,
    evictionUnsuccessfulReturnTypeList,
    interimReturnTypeList,
    headerModel: xuiHeaderModel(req),
    additionalDetailsMaxLength: ADDITIONAL_DETAILS_MAX_LENGTH,
    answers,
    evictionDateError: issues.find(issue => issue.id.startsWith(`${EVICTION_DATE_ID}-`))?.message,
  };
}

export default function recordWarrantReturnRoutes(app: Application): void {
  app.get(route('warrantReturn'), ...journey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseReference = caseReferenceOf(req);
      const answers = answersFromSession(req.session.warrantReturn?.[caseReference]);

      res.render('record-warrant-return/warrant-return', {
        ...formModel(req, answers),
        ...(await caseModel(req, caseReference)),
      });
    } catch (error) {
      refusedXuiEvent(res, next, error);
    }
  });

  app.post(route('warrantReturn'), ...journey, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = caseReferenceOf(req);
    const answers = answersFromBody(req.body);
    const { issues, warrantReturn } = validateWarrantReturn(answers);

    if (issues.length > 0 || !warrantReturn) {
      try {
        return res.status(400).render('record-warrant-return/warrant-return', {
          ...formModel(req, answers, issues),
          ...(await caseModel(req, caseReference)),
        });
      } catch (error) {
        return refusedXuiEvent(res, next, error);
      }
    }

    req.session.warrantReturn = { ...req.session.warrantReturn, [caseReference]: warrantReturn };
    req.session.save(error => (error ? next(error) : res.redirect(pageUrl(caseReference, 'checkYourAnswers'))));
  });

  app.get(route('checkYourAnswers'), ...journey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.render('record-warrant-return/check-your-answers', {
        ...pageModel(req),
        ...(await caseModel(req, caseReferenceOf(req))),
      });
    } catch (error) {
      refusedXuiEvent(res, next, error);
    }
  });

  app.post(route('checkYourAnswers'), ...journey, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = caseReferenceOf(req);
    if (req.body.action === 'previous') {
      return res.redirect(pageUrl(caseReference, 'warrantReturn'));
    }

    const warrantReturn = req.session.warrantReturn?.[caseReference];
    if (!warrantReturn) {
      return res.redirect(pageUrl(caseReference, 'warrantReturn'));
    }

    try {
      const accessToken = req.session.user!.accessToken;
      await ccdCaseService.startAndSubmitEvent(accessToken, caseReference, RECORD_WARRANT_RETURN_EVENT_ID, {
        warrantReturn,
      });
    } catch (error) {
      return refusedXuiEvent(res, next, error, rejected => void showFailedSubmit(req, res, next, rejected));
    }

    delete req.session.warrantReturn![caseReference];
    req.session.save(error => (error ? next(error) : res.redirect(pageUrl(caseReference, 'confirmed'))));
  });

  app.get(route('confirmed'), ...journey, (req: Request, res: Response) => {
    res.render('record-warrant-return/confirmation', {
      ...pageModel(req),
    });
  });

  app.get(route('cancel'), ...journey, (req: Request, res: Response) => {
    res.redirect(manageCaseDetailsUrl(caseReferenceOf(req)));
  });
}

async function showFailedSubmit(
  req: Request,
  res: Response,
  next: NextFunction,
  error: CallbackRejectedError
): Promise<void> {
  try {
    const issues = error.reasons.map(message => ({ id: 'record-warrant-return-form', message }));
    res.status(error.status).render('record-warrant-return/check-your-answers', {
      ...pageModel(req, issues),
      ...(await caseModel(req, caseReferenceOf(req))),
    });
  } catch (renderError) {
    next(renderError);
  }
}

function text(body: Record<string, unknown> | undefined, name: string): string {
  const value = body?.[name];
  return typeof value === 'string' ? value : '';
}

function answersFromBody(body: Record<string, unknown> | undefined): WarrantReturnAnswers {
  return {
    returnType: text(body, 'return-type').trim(),
    finalOutcome: text(body, 'final-outcome').trim(),
    evictionSuccessfulReturnName: text(body, 'eviction-successful-return-name').trim(),
    evictionUnsuccessfulReturnName: text(body, 'eviction-unsuccessful-return-name').trim(),
    interimReturnName: text(body, 'interim-return-name').trim(),
    additionalDetails: text(body, 'additional-details'),
    evictionDate: Object.fromEntries(
      EVICTION_DATE_PARTS.map(part => [part, text(body, `${EVICTION_DATE_ID}-${part}`).trim()])
    ) as Record<EvictionDatePart, string>,
  };
}

function answersFromSession(warrantReturn: WarrantReturn | undefined): WarrantReturnAnswers {
  const evictionDate = warrantReturn?.outcomeDate
    ? DateTime.fromISO(warrantReturn.outcomeDate, { zone: 'utc' }).setZone(EVICTION_DATE_ZONE)
    : undefined;
  const isFinal = warrantReturn?.returnType === WarrantReturnType.FINAL;
  const outcome = warrantReturn?.evictionOutcome;

  return {
    returnType: warrantReturn?.returnType ?? '',
    finalOutcome: (isFinal && outcome) || '',
    evictionSuccessfulReturnName:
      (isFinal && outcome === EvictionOutcome.SUCCESSFUL && warrantReturn?.returnName) || '',
    evictionUnsuccessfulReturnName:
      (isFinal && outcome !== EvictionOutcome.SUCCESSFUL && warrantReturn?.returnName) || '',
    interimReturnName: (warrantReturn?.returnType === WarrantReturnType.INTERIM && warrantReturn.returnName) || '',
    additionalDetails: warrantReturn?.additionalDetails ?? '',
    evictionDate: Object.fromEntries(
      EVICTION_DATE_PARTS.map(part => [
        part,
        evictionDate?.isValid ? String(part === 'minute' ? evictionDate.toFormat('mm') : evictionDate[part]) : '',
      ])
    ) as Record<EvictionDatePart, string>,
  };
}

function oneOf<T extends string>(values: Record<string, T>, value: string): T | undefined {
  return (Object.values(values) as string[]).includes(value) ? (value as T) : undefined;
}

export function validateWarrantReturn(answers: WarrantReturnAnswers): ValidationResult {
  const result = validateReturn(answers);
  const issues = [
    ...result.issues,
    ...validateAdditionalDetails(answers.additionalDetails, isAdditionalDetailsMandatory(answers)),
  ];
  return issues.length > 0 ? { issues } : result;
}

function validateReturn(answers: WarrantReturnAnswers): ValidationResult {
  switch (answers.returnType) {
    case WarrantReturnType.FINAL:
      return validateFinalWarrantReturn(answers);
    case WarrantReturnType.INTERIM:
      return validateInterimWarrantReturn(answers);
    default:
      return { issues: [{ id: 'return-type', message: RETURN_TYPE_ERROR_MESSAGE }] };
  }
}

function validateFinalWarrantReturn(answers: WarrantReturnAnswers): ValidationResult {
  const outcome = oneOf(EvictionOutcome, answers.finalOutcome);
  switch (outcome) {
    case EvictionOutcome.SUCCESSFUL:
      return validateEvictionSuccessful(answers);
    case EvictionOutcome.UNSUCCESSFUL:
    case EvictionOutcome.CANCELLED:
      return validateEvictionUnsuccessful(answers, outcome);
    default:
      return { issues: [{ id: 'final-outcome', message: FINAL_OUTCOME_ERROR_MESSAGE }] };
  }
}

function validateEvictionSuccessful(answers: WarrantReturnAnswers): ValidationResult {
  const issues: ValidationIssue[] = [];

  const returnName = oneOf(EvictionSuccessfulReturnName, answers.evictionSuccessfulReturnName);
  if (!returnName) {
    issues.push({ id: 'eviction-successful-return-name', message: RETURN_NAME_ERROR_MESSAGE });
  }

  const evictionDate = validateEvictionDate(answers.evictionDate, issues);

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    warrantReturn: {
      returnType: WarrantReturnType.FINAL,
      evictionOutcome: EvictionOutcome.SUCCESSFUL,
      returnName,
      outcomeDate: evictionDate,
      additionalDetails: answers.additionalDetails,
    },
  };
}

function validateEvictionUnsuccessful(answers: WarrantReturnAnswers, outcome: EvictionOutcome): ValidationResult {
  const issues: ValidationIssue[] = [];

  const returnName = oneOf(EvictionUnsuccessfulReturnName, answers.evictionUnsuccessfulReturnName);
  if (!returnName) {
    issues.push({ id: 'eviction-unsuccessful-return-name', message: RETURN_NAME_ERROR_MESSAGE });
  }

  const evictionDate = validateEvictionDate(answers.evictionDate, issues);

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    warrantReturn: {
      returnType: WarrantReturnType.FINAL,
      evictionOutcome: outcome,
      returnName,
      outcomeDate: evictionDate,
      additionalDetails: answers.additionalDetails || undefined,
    },
  };
}

function validateInterimWarrantReturn(answers: WarrantReturnAnswers): ValidationResult {
  const issues: ValidationIssue[] = [];

  const returnName = oneOf(InterimReturnName, answers.interimReturnName);
  if (!returnName) {
    issues.push({ id: 'interim-return-name', message: RETURN_NAME_ERROR_MESSAGE });
  }

  const evictionDate = validateEvictionDate(answers.evictionDate, issues);

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    warrantReturn: {
      returnType: WarrantReturnType.INTERIM,
      returnName,
      outcomeDate: evictionDate,
      additionalDetails: answers.additionalDetails || undefined,
    },
  };
}

function validateAdditionalDetails(additionalDetails: string, isMandatory: boolean): ValidationIssue[] {
  if (isMandatory && !additionalDetails.trim()) {
    return [{ id: 'additional-details', message: ADDITIONAL_DETAILS_ERROR_MESSAGE }];
  }
  if (additionalDetails.length > ADDITIONAL_DETAILS_MAX_LENGTH) {
    return [{ id: 'additional-details', message: ADDITIONAL_DETAILS_TOO_LONG_ERROR_MESSAGE }];
  }
  return [];
}

function validateEvictionDate(
  parts: Record<EvictionDatePart, string>,
  issues: ValidationIssue[],
  now: DateTime = DateTime.now()
): string | undefined {
  const fieldId = (part: EvictionDatePart) => `${EVICTION_DATE_ID}-${part}`;

  const missing = EVICTION_DATE_PARTS.filter(part => !parts[part]);
  if (missing.length === EVICTION_DATE_PARTS.length) {
    issues.push({ id: fieldId('day'), message: EVICTION_DATE_REQUIRED_ERROR_MESSAGE });
    return undefined;
  }
  if (missing.length > 0) {
    issues.push({ id: fieldId(missing[0]), message: EVICTION_DATE_ERROR_MESSAGE });
    return undefined;
  }

  const notNumeric = EVICTION_DATE_PARTS.find(part =>
    part === 'year' ? !/^\d{4}$/.test(parts[part]) : !/^\d{1,2}$/.test(parts[part])
  );
  if (notNumeric) {
    issues.push({ id: fieldId(notNumeric), message: EVICTION_DATE_ERROR_MESSAGE });
    return undefined;
  }

  const [day, month, year, hour, minute] = EVICTION_DATE_PARTS.map(part => Number(parts[part]));
  const evictionDate = DateTime.fromObject({ day, month, year, hour, minute }, { zone: EVICTION_DATE_ZONE });
  if (!evictionDate.isValid || evictionDate.hour !== hour || evictionDate.minute !== minute) {
    issues.push({ id: fieldId('day'), message: EVICTION_DATE_ERROR_MESSAGE });
    return undefined;
  }

  if (evictionDate > now) {
    issues.push({ id: fieldId('day'), message: EVICTION_DATE_FUTURE_ERROR_MESSAGE });
    return undefined;
  }

  return evictionDate.toUTC().toISO({ includeOffset: false }) ?? undefined;
}
