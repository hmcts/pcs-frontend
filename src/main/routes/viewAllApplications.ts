import { Application, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { getDashboardUrl } from '@routes/dashboard';
import { CcdCollectionItem, GenApp, GenAppType, Party } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { sanitiseCaseReference } from '@utils/caseReference';

const logger = Logger.getLogger('viewAllApplications');

type GenAppDocument = {
  filename: string;
  documentId?: string;
};

type GenAppSummary = {
  applicationType: GenAppType;
  party: Party;
  submittedOn: string;
  submissionDocument: GenAppDocument;
  supportingDocuments?: GenAppDocument[];
};

type PartyGenApps = {
  party: Party;
  genApps: GenAppSummary[];
};

export default function viewAllApplicationsRoutes(app: Application): void {
  app.get('/case/:caseReference/view-all-applications', oidcMiddleware, async (req: Request, res: Response) => {
    const accessToken = req.session.user?.accessToken;
    if (!accessToken) {
      logger.warn('User not authenticated - no access token');
      throw new HTTPError('Authentication required', 401);
    }

    const rawCaseReference = req.params.caseReference as string;
    const caseReference = sanitiseCaseReference(rawCaseReference);
    if (!caseReference) {
      return null;
    }

    const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);

    // Gen apps are ordered in the CCD data by submission date descending
    const allGenApps = ccdCase?.data.genApps || [];
    const currentUserIdamId = req.session.user?.uid as string;

    const userGenApps = buildUserGenAppSummaries(allGenApps, currentUserIdamId);
    const otherPartyGenAppsMap = buildOtherPartyGenAppsMap(allGenApps, currentUserIdamId);
    const formattedCaseReference = caseReference.replace(/(\d{4})(?=\d)/g, '$1 ');

    res.render('view-all-applications', {
      caseReference,
      formattedCaseReference,
      dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
      userGenApps,
      otherPartyGenAppsMap,
    });
  });
}

function toGenAppSummary(genApp: GenApp): GenAppSummary {
  return {
    applicationType: genApp.applicationType,
    party: genApp.party,
    submittedOn: genApp.submittedOn,
    submissionDocument: {
      filename: genApp.submissionDocument.document.document_filename,
      documentId: genApp.submissionDocument.id,
    },
  };
}

function isForApplicant(genApp: GenApp, currentUserIdamId: string) {
  return genApp.party.idamId && genApp.party.idamId === currentUserIdamId;
}

function buildUserGenAppSummaries(allGenApps: CcdCollectionItem<GenApp>[], currentUserIdamId: string) {
  return allGenApps
    .map(genAppListValue => genAppListValue.value)
    .filter(genApp => isForApplicant(genApp, currentUserIdamId))
    .map(toGenAppSummary);
}

function buildOtherPartyGenAppsMap(allGenApps: CcdCollectionItem<GenApp>[], currentUserIdamId: string) {
  // The Map type maintains the insertion order of keys when iterating
  const initialMap = new Map<string, PartyGenApps>();

  if (allGenApps.length === 0) {
    return initialMap;
  }

  return allGenApps
    .map(genAppListValue => genAppListValue.value)
    .filter(genApp => !isForApplicant(genApp, currentUserIdamId))
    .map(toGenAppSummary)
    .reduce((partyGenAppsMap: Map<string, PartyGenApps>, genAppSummary: GenAppSummary) => {
      const partyId = genAppSummary.party.id;

      let partyGenApps = partyGenAppsMap.get(partyId);
      if (!partyGenApps) {
        partyGenApps = {
          party: genAppSummary.party,
          genApps: [],
        };
        partyGenAppsMap.set(partyId, partyGenApps);
      }
      partyGenApps.genApps.push(genAppSummary);

      return partyGenAppsMap;
    }, initialMap);
}
