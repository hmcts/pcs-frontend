import {
  confirmIfTheseDocumentsRelateToAnApplicationStep,
  flowConfig,
  uploadYourDocumentsStep,
} from '../../../../../main/steps/case-tasks/upload-additional-documents/flow.config';
import { isViewAllApplicationsAvailable } from '../../../../../main/steps/case-tasks/upload-additional-documents/flowConditions';

describe('upload-additional-documents flow.config', () => {
  describe('start-now branching', () => {
    const startNow = flowConfig.steps['start-now'];

    it('should not use defaultNext (branching is via routes)', () => {
      expect(startNow.defaultNext).toBeUndefined();
    });

    it('should define routes in the correct branching order', () => {
      expect(startNow.routes).toBeDefined();
      expect(startNow.routes).toHaveLength(2);
    });

    it('routes the user to confirm-if-these-documents-relate-to-an-application when isViewAllApplicationsAvailable is true', () => {
      const conditionalRoute = startNow.routes?.[0];

      expect(conditionalRoute?.condition).toBe(isViewAllApplicationsAvailable);
      expect(conditionalRoute?.nextStep).toBe(confirmIfTheseDocumentsRelateToAnApplicationStep);
      expect(conditionalRoute?.nextStep).toBe('confirm-if-these-documents-relate-to-an-application');
    });

    it('falls through to upload-your-documents as the default branch', () => {
      const fallbackRoute = startNow.routes?.[1];

      expect(fallbackRoute?.condition).toBeUndefined();
      expect(fallbackRoute?.nextStep).toBe(uploadYourDocumentsStep);
      expect(fallbackRoute?.nextStep).toBe('upload-your-documents');
    });
  });
});
