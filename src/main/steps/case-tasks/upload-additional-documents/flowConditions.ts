import type { Request } from 'express';

import { Logger } from '@modules/logger';
import type { StepCondition } from '@modules/steps/stepFlow.interface';
import { ccdCaseService } from '@services/ccdCaseService';

const logger = Logger.getLogger('uploadAdditionalDocumentsFlowConditions');

export const isViewAllApplicationsAvailable: StepCondition = async (req: Request) => {
  const accessToken = req.session?.user?.accessToken;
  const caseReference = req.res?.locals.validatedCase?.id;

  if (!accessToken || !caseReference) {
    return false;
  }

  try {
    const { taskGroups } = await ccdCaseService.getDashboardView(accessToken, caseReference);
    return taskGroups.some(group =>
      group.tasks.some(task => task.templateId === 'ViewAllApplications' && task.status === 'AVAILABLE')
    );
  } catch (error) {
    logger.warn(`Failed to resolve VIEW_ALL_APPLICATIONS status for case ${caseReference}: ${String(error)}`);
    return false;
  }
};
