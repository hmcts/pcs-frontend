import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';
import config from 'config';

import { OrdersDemoPayload } from '../interfaces/ccdCase.interface';
import { oidcMiddleware } from '../middleware';
import { ccdCaseService } from '../services/ccdCaseService';

// Temporary import from the header shell package; uses CommonJS, so require here for type simplicity.
const { renderHeaderShell, renderFooterShell } = require('hmcts-header-shell-demo/render');

type DemoTheme = 'judicial' | 'case-manager' | 'default';

interface OrdersDemoViewModel {
  themeName: DemoTheme;
  headerShell: unknown;
  footerShell: unknown;
  caseReference: string;
  basePath: string;
  caseTitle: string;
  claimantName: string;
  defendantName: string;
  otherDefendants: string[];
  defendants: string[];
  lastUpdated: string;
  lastUpdatedBy: string;
  dateOfTenancy: string;
  dateNoticeServed: string;
  grounds: string;
  arrearsOnIssue: string;
  arrearsAtNotice: string;
  arrearsAtHearing: string;
  currentRent: string;
  currentRentFrequency: 'week' | 'month' | 'quarter' | 'year';
}

const logger = Logger.getLogger('ordersDemo');

const keepOnlyCreateCaseNav = (html: string): string => {
  const listMatch = html.match(/(<ul class="hmcts-primary-navigation__list">)([\s\S]*?)(<\/ul>)/);
  if (!listMatch) {
    return html;
  }

  const items = Array.from(listMatch[2].matchAll(/<li class="hmcts-primary-navigation__item">[\s\S]*?<\/li>/g)).map(
    match => match[0]
  );
  const createCaseItem = items.find(item => /Create case/i.test(item));
  const myWorkItem = `
                  <li class="hmcts-primary-navigation__item">
                    <a class="hmcts-primary-navigation__link" href="/work">
                      <span class="hmcts-primary-navigation__link-text">My work</span>
                    </a>
                  </li>`;

  const baseItems = createCaseItem ? [createCaseItem] : items;
  const navItems = baseItems.some(item => /My work/i.test(item)) ? baseItems : [myWorkItem, ...baseItems];

  return html.replace(
    listMatch[0],
    `${listMatch[1]}
                  ${navItems.join('\n                  ')}
                ${listMatch[3]}`
  );
};

const defaultCaseReference = '1234-5678-9101';

const normaliseDate = (body: Request['body'], prefix: string): string | null => {
  const direct = typeof body[prefix] === 'string' ? body[prefix].trim() : '';
  const day = typeof body[`${prefix}-day`] === 'string' ? body[`${prefix}-day`].padStart(2, '0') : '';
  const month = typeof body[`${prefix}-month`] === 'string' ? body[`${prefix}-month`].padStart(2, '0') : '';
  const year = typeof body[`${prefix}-year`] === 'string' ? body[`${prefix}-year`] : '';

  if (day && month && year) {
    return `${day}/${month}/${year}`;
  }
  return direct || null;
};

const parseMoney = (value: unknown): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : Number(parsed.toFixed(2));
};

const buildOrdersPayload = (rawBody: Request['body']): OrdersDemoPayload => {
  const body = (rawBody || {}) as Record<string, unknown>;
  const asArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter(v => typeof v === 'string') as string[];
    }
    return typeof value === 'string' ? [value] : [];
  };

  const groundsValues = asArray(body.grounds);
  const groundsMode =
    groundsValues.find(value => value === 'discretionary' || value === 'mandatory') ||
    (typeof body.grounds === 'string' && (body.grounds === 'discretionary' || body.grounds === 'mandatory')
      ? body.grounds
      : null);
  const judicialGrounds =
    groundsValues.find(value => value !== 'discretionary' && value !== 'mandatory') ||
    (typeof body.grounds === 'string' && body.grounds !== 'discretionary' && body.grounds !== 'mandatory'
      ? body.grounds
      : '');

  const getAttendanceEntries = (): OrdersDemoPayload['attendance'] => {
    const defendantAttendances = Object.entries(body)
      .filter(([key]) => /^defendant-\d+-attendance$/.test(key))
      .map(([key, value]) => {
        const match = key.match(/^defendant-(\d+)-attendance$/);
        const idx = match ? match[1] : '';
        const nameKey = `defendant-${idx}-attendance-name`;
        return {
          party: `Defendant ${idx}`,
          mode: typeof value === 'string' ? value : null,
          name: typeof body[nameKey] === 'string' ? body[nameKey] : null,
        };
      });

    return {
      claimant: {
        party: 'Claimant',
        mode: typeof body.claimantAttendance === 'string' ? body.claimantAttendance : null,
        name: typeof body.claimantAttendanceName === 'string' ? body.claimantAttendanceName : null,
      },
      defendants: defendantAttendances,
    };
  };

  const isChecked = (value: unknown): boolean => typeof value === 'string' && value.length > 0;
  const previewText =
    (typeof body.previewFreeText === 'string' && body.previewFreeText.trim()) ||
    (typeof body.generatedPreviewText === 'string' && body.generatedPreviewText.trim()) ||
    '';

  return {
    orderType: typeof body.orderType === 'string' ? body.orderType : 'outright',
    previewText,
    previewStatus: typeof body.generatedPreviewStatus === 'string' ? body.generatedPreviewStatus : undefined,
    previewWasEdited: Boolean(typeof body.previewFreeText === 'string' && body.previewFreeText.trim()),
    judicialNotes: {
      dateOfTenancy: typeof body.dateOfTenancy === 'string' ? body.dateOfTenancy : undefined,
      dateNoticeServed: typeof body.dateNotice === 'string' ? body.dateNotice : undefined,
      groundsText: judicialGrounds,
      arrearsOnIssue: typeof body.arrearsOnIssue === 'string' ? body.arrearsOnIssue : undefined,
      arrearsAtNotice: typeof body.arrearsAtNotice === 'string' ? body.arrearsAtNotice : undefined,
      arrearsAtHearing: typeof body.arrearsAtHearing === 'string' ? body.arrearsAtHearing : undefined,
      currentRent: typeof body.currentRent === 'string' ? body.currentRent : undefined,
      currentRentFrequency: typeof body.currentRentFrequency === 'string' ? body.currentRentFrequency : undefined,
      hearingNotes: typeof body.hearingNotes === 'string' ? body.hearingNotes : undefined,
    },
    attendance: getAttendanceEntries(),
    orderDetails: {
      groundsMode: typeof groundsMode === 'string' ? groundsMode : null,
      mandatoryGroundsDetails: typeof body.mandatoryGroundsDetails === 'string' ? body.mandatoryGroundsDetails : null,
      outright: {
        timing: typeof body.outrightTiming === 'string' ? body.outrightTiming : null,
        possessionDate: normaliseDate(body, 'outrightBy'),
      },
      suspended: {
        possessionDate: normaliseDate(body, 'suspendedBy'),
        arrears: {
          enabled: isChecked(body.arrearsCheckbox),
          amount: typeof body.arrearsAmount === 'string' ? body.arrearsAmount : null,
          dueBy: typeof body.arrearsDueBy === 'string' ? body.arrearsDueBy : null,
        },
        initialPayment: {
          enabled: isChecked(body.initialPaymentCheckbox),
          amount: typeof body.initialPayment === 'string' ? body.initialPayment : null,
          dueBy: typeof body.initialPaymentBy === 'string' ? body.initialPaymentBy : null,
        },
        instalments: {
          enabled: isChecked(body.instalmentCheckbox),
          amount: typeof body.instalmentAmount === 'string' ? body.instalmentAmount : null,
          frequency: typeof body.instalmentFrequency === 'string' ? body.instalmentFrequency : null,
          dueBy: typeof body.instalmentDueBy === 'string' ? body.instalmentDueBy : null,
        },
      },
      adjournment: {
        nextHearingDate: normaliseDate(body, 'adjournNextHearing'),
        timeEstimate: typeof body.adjournTimeEstimate === 'string' ? body.adjournTimeEstimate : null,
        time: typeof body.adjournTime === 'string' ? body.adjournTime : null,
        hearingType: typeof body.adjournHearingType === 'string' ? body.adjournHearingType : null,
        location: typeof body.adjournLocation === 'string' ? body.adjournLocation : null,
        directions: typeof body.adjournDirections === 'string' ? body.adjournDirections : null,
        reason: typeof body.adjournReason === 'string' ? body.adjournReason : null,
      },
    },
    judgment: {
      enabled: isChecked(body.judgmentEnabled),
      defendants: asArray(body.judgmentDefendants),
      arrears: {
        enabled: isChecked(body.judgmentArrearsEnabled),
        amount: typeof body.judgmentArrearsAmount === 'string' ? body.judgmentArrearsAmount : null,
      },
      interest: {
        enabled: isChecked(body.judgmentInterestEnabled),
        amount: typeof body.judgmentInterestAmount === 'string' ? body.judgmentInterestAmount : null,
      },
      useAndOccupation: {
        enabled: isChecked(body.judgmentUseOccupationEnabled),
        dailyRate: typeof body.judgmentUseOccupationDailyRate === 'string' ? body.judgmentUseOccupationDailyRate : null,
        from: typeof body.judgmentUseOccupationFrom === 'string' ? body.judgmentUseOccupationFrom : null,
      },
      suspendedOnSameTerms: isChecked(body.judgmentSuspendedSameTerms),
      instalments: {
        enabled: isChecked(body.judgmentInstalmentsEnabled),
        amount: typeof body.judgmentInstalmentsAmount === 'string' ? body.judgmentInstalmentsAmount : null,
        frequency: typeof body.judgmentInstalmentsFrequency === 'string' ? body.judgmentInstalmentsFrequency : null,
        frequencyOther:
          typeof body.judgmentInstalmentsFrequencyOther === 'string' ? body.judgmentInstalmentsFrequencyOther : null,
        firstPaymentBy:
          typeof body.judgmentInstalmentsFirstPaymentBy === 'string' ? body.judgmentInstalmentsFirstPaymentBy : null,
      },
    },
    costs: {
      mode: typeof body.costsMode === 'string' ? body.costsMode : null,
      fixedAmount: parseMoney(body.costsFixedAmount),
      assessedAmount: parseMoney(body.costsAssessedAmount),
      assessedBasis: typeof body.costsAssessedBasis === 'string' ? body.costsAssessedBasis : null,
      payBy: typeof body.costsPayBy === 'string' ? body.costsPayBy : null,
      addToDebt: isChecked(body.costsAddToDebt),
    },
  };
};

const buildViewModel = (req: Request, caseReferenceParam?: string): OrdersDemoViewModel => {
  const theme = typeof req.query.theme === 'string' ? req.query.theme : 'judicial';
  const allowedThemes = new Set<DemoTheme>(['judicial', 'case-manager', 'default']);
  const themeName = allowedThemes.has(theme as DemoTheme) ? (theme as DemoTheme) : 'judicial';
  const caseReference = caseReferenceParam && caseReferenceParam.trim() ? caseReferenceParam : defaultCaseReference;
  const basePath = `/orders-demo/${encodeURIComponent(caseReference)}`;

  const headerShell = (() => {
    const roles = themeName === 'judicial' ? ['pui-judicial'] : ['pui-case-manager'];
    const shell = renderHeaderShell({
      roles,
      theme: themeName,
      assetBase: '/',
    });

    const adjustedHtml = keepOnlyCreateCaseNav(shell.html)
      .replace(/data-theme="[^"]*"/, `data-theme="${themeName}"`)
      .replace(/data-roles="[^"]*"/, `data-roles="${roles.join(',')}"`);

    return {
      ...shell,
      html: adjustedHtml,
    };
  })();
  const footerShell = renderFooterShell({ assetBase: '/' });
  const otherDefendants = ['Taylor', 'Patel'];
  const today = (() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  })();

  return {
    themeName,
    headerShell,
    footerShell,
    caseReference,
    basePath,
    caseTitle: 'Smith v Jones',
    claimantName: 'Smith',
    defendantName: 'Jones',
    otherDefendants,
    defendants: ['Jones', ...otherDefendants],
    lastUpdated: today,
    lastUpdatedBy: 'DJ Daley',
    dateOfTenancy: '01/05/2020',
    dateNoticeServed: '15/09/2024',
    grounds: '8, 10, 11',
    arrearsOnIssue: '825.00',
    arrearsAtNotice: '1100.00',
    arrearsAtHearing: '1250.00',
    currentRent: '550.00',
    currentRentFrequency: 'month',
  };
};

export default function (app: Application): void {
  app.get('/orders-demo/:caseReference', oidcMiddleware, async (req: Request, res: Response, next) => {
    try {
      const viewModel = buildViewModel(req, req.params.caseReference);

      const submitted = req.query.submitted === '1';
      res.render('orders-demo', { ...viewModel, submitted });
    } catch (error) {
      next(error);
    }
  });

  app.post('/orders-demo/:caseReference', oidcMiddleware, async (req: Request, res: Response, next) => {
    const caseReference = req.params.caseReference?.trim();

    if (!caseReference) {
      return res.status(400).send('A case reference is required');
    }

    try {
      const accessToken =
        req.session.user?.accessToken ||
        process.env.PCS_IDAM_TOKEN ||
        process.env.IDAM_ACCESS_TOKEN ||
        ((config as { has?: (key: string) => boolean }).has?.('secrets.pcs.pcs-judge-token')
          ? (config.get('secrets.pcs.pcs-judge-token') as string)
          : undefined);
      req.session.user = { ...(req.session.user || {}), accessToken } as Request['session']['user'];
      const caseData = { ordersDemoPayload: buildOrdersPayload(req.body) };
      await ccdCaseService.createOrder(caseReference, caseData, accessToken);
      const targetReference = caseReference.replace(/\D/g, '') || caseReference;
      const redirectUrl = `http://localhost:3000/cases/case-details/PCS/PCS/${encodeURIComponent(targetReference)}#History`;
      return res.redirect(303, redirectUrl);
    } catch (error) {
      logger.error(`[ordersDemo] Failed to submit createOrder event: ${(error as Error).message}`);
      return next(error);
    }
  });

  app.get('/orders-demo', oidcMiddleware, (req: Request, res: Response) => {
    res.redirect(
      `/orders-demo/${defaultCaseReference}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`
    );
  });
}
