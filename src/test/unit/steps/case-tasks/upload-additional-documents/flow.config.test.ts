import {
  confirmIfTheseDocumentsRelateToAnApplicationStep,
  flowConfig,
  uploadYourDocumentsStep,
} from '../../../../../main/steps/case-tasks/upload-additional-documents/flow.config';
import { isViewAllApplicationsAvailable } from '../../../../../main/steps/case-tasks/upload-additional-documents/flowConditions';

describe('upload-additional-documents flow.config', () => {
  describe('start-evidence-upload branching', () => {
    const startEvidenceUpload = flowConfig.steps['start-evidence-upload'];

    it('should not use defaultNext (branching is via routes)', () => {
      expect(startEvidenceUpload.defaultNext).toBeUndefined();
    });

    it('should define routes in the correct branching order', () => {
      expect(startEvidenceUpload.routes).toBeDefined();
      expect(startEvidenceUpload.routes).toHaveLength(2);
    });

    it('routes the user to confirm-if-these-documents-relate-to-an-application when isViewAllApplicationsAvailable is true', () => {
      const conditionalRoute = startEvidenceUpload.routes?.[0];

      expect(conditionalRoute?.condition).toBe(isViewAllApplicationsAvailable);
      expect(conditionalRoute?.nextStep).toBe(confirmIfTheseDocumentsRelateToAnApplicationStep);
      expect(conditionalRoute?.nextStep).toBe('confirm-if-these-documents-relate-to-an-application');
    });

    it('falls through to upload-your-documents as the default branch', () => {
      const fallbackRoute = startEvidenceUpload.routes?.[1];

      expect(fallbackRoute?.condition).toBeUndefined();
      expect(fallbackRoute?.nextStep).toBe(uploadYourDocumentsStep);
      expect(fallbackRoute?.nextStep).toBe('upload-your-documents');
    });
  });
});
