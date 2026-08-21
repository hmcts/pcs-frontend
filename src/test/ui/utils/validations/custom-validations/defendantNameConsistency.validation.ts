import { Page, expect } from '@playwright/test';

import { DefendantNames, getDefendantNameReport } from '../../actions/custom-actions/defendantNameDivergenceAPI.action';
import { IValidation, validationData, validationRecord } from '../../interfaces';

/**
 * HDPI-7686: the name printed on the bulk-print coversheet must match the name on the enclosed
 * defence form. The coversheet is resolved from the party record only
 * (RecipientAddressResolver.resolveDisplayName), while the form prefers the defendant's own
 * DEFENDANT_NAME assertion (DefenceFormPayloadBuilder.resolveDefendantName), so the two can disagree
 * whenever the defendant supplies or disputes their name.
 */
export class DefendantNameConsistencyValidation implements IValidation {
  async validate(
    page: Page,
    validation: string,
    fieldName?: validationData | validationRecord,
    data?: validationData | validationRecord
  ): Promise<void> {
    const input = (typeof fieldName === 'object' ? fieldName : data) as { expectedName?: string } | undefined;
    const expectedName = input?.expectedName;
    if (!expectedName) {
      throw new Error("defendantNameConsistency requires an 'expectedName'");
    }

    const report = getDefendantNameReport();
    if (!report) {
      throw new Error('No defendant name report available - run the fetchDefendantNameReportAPI action first');
    }

    const defendant = this.findRespondingDefendant(report.defendants);
    if (!defendant) {
      throw new Error(
        `Could not identify the responding defendant in the report: ${JSON.stringify(report.defendants)}`
      );
    }

    // Sanity check: the journey did record the name the defendant typed.
    expect(
      defendant.formName,
      `The defence form name should be the name the defendant supplied. Report: ${JSON.stringify(defendant)}`
    ).toBe(expectedName);

    // The defect itself: the coversheet is resolved separately and can still say something else.
    expect(
      defendant.coversheetName,
      `HDPI-7686: the bulk-print coversheet would be addressed to '${defendant.coversheetName}' but the enclosed ` +
        `defence form says '${defendant.formName}'. Report: ${JSON.stringify(defendant)}`
    ).toBe(expectedName);

    this.warnAboutOtherDefendants(report.defendants, defendant);
  }

  /**
   * The responding defendant is the one who asserted a name. Only one defendant responds per journey,
   * so fall back to the sole defendant when a case has just one.
   */
  private findRespondingDefendant(defendants: DefendantNames[]): DefendantNames | undefined {
    const withAssertion = defendants.filter(defendant => defendant.defendantNameAssertion);
    if (withAssertion.length === 1) {
      return withAssertion[0];
    }
    return defendants.length === 1 ? defendants[0] : undefined;
  }

  /**
   * Divergence on a defendant who has not responded is a separate (and expected) gap - a defendant the
   * claimant could not name has no assertion to fall back on - so surface it without failing the test.
   */
  private warnAboutOtherDefendants(defendants: DefendantNames[], respondingDefendant: DefendantNames): void {
    defendants
      .filter(defendant => defendant.partyId !== respondingDefendant.partyId && defendant.diverges)
      .forEach(defendant =>
        console.warn(
          `Non-responding defendant ${defendant.partyId} also diverges: coversheet '${defendant.coversheetName}' ` +
            `vs form '${defendant.formName}'`
        )
      );
  }
}
