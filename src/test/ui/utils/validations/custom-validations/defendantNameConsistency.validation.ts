import { Page, expect } from '@playwright/test';

import {
  CaseNameReport,
  PartyNames,
  getDefendantNameReport,
} from '../../actions/custom-actions/defendantNameDivergenceAPI.action';
import { IValidation, validationData, validationRecord } from '../../interfaces';

/**
 * HDPI-7686: the name printed on the bulk-print defence pack coversheet must match the name the defendant
 * actually supplied. The coversheet is resolved from the party record alone
 * (RecipientAddressResolver.resolveDisplayName), while the enclosed defence form prefers the defendant's own
 * DEFENDANT_NAME assertion (DefenceFormPayloadBuilder.resolveDefendantName), so the two diverge whenever the
 * response fails to write the supplied name back to the party.
 *
 * Reverting pcs-api#2114 reproduces both reported symptoms:
 *   Issue 1 - claimant could not name the defendant: nameKnown stays NO, coversheet says "Persons unknown".
 *   Issue 2 - defendant corrects a claimant-supplied name: the name is never written, coversheet keeps the old one.
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

    const defendant = this.findRespondingDefendant(report.parties);
    if (!defendant) {
      throw new Error(`Could not identify the responding defendant in the report: ${JSON.stringify(report.parties)}`);
    }

    // Always print the comparison, so a QA reading the run sees both names whether it passes or fails.
    console.log(
      [
        '',
        'HDPI-7686 defendant name check',
        `  case reference          : ${report.caseReference}`,
        `  name the defendant gave : ${expectedName}`,
        `  defence form name       : ${defendant.ownFormName}`,
        `  coversheet name         : ${defendant.coversheetName}`,
        `  party record            : firstName=${defendant.firstName} lastName=${defendant.lastName} ` +
          `nameKnown=${defendant.nameKnown}`,
        ...this.describePacks(report, defendant),
        '',
      ].join('\n')
    );

    // Sanity check: the journey did record the name the defendant typed.
    expect(
      defendant.ownFormName,
      `The defence form name should be the name the defendant supplied. Report: ${JSON.stringify(defendant)}`
    ).toBe(expectedName);

    // The defect itself: the coversheet is resolved separately and can still say something else.
    expect(
      defendant.coversheetName,
      `HDPI-7686: the defence pack coversheet would be addressed to '${defendant.coversheetName}' but the ` +
        `defendant supplied '${expectedName}' (the enclosed defence form says '${defendant.ownFormName}'). ` +
        `Report: ${JSON.stringify(defendant)}`
    ).toBe(expectedName);

    // Any pack already posted to this defendant must also carry the supplied name.
    const ownPacks = report.defencePacks.filter(pack => pack.recipientPartyId === defendant.partyId);
    for (const pack of ownPacks) {
      expect(
        pack.recipientCoversheetName,
        `HDPI-7686: dispatched defence pack ${pack.letterId} was addressed to ` +
          `'${pack.recipientCoversheetName}' rather than '${expectedName}'`
      ).toBe(expectedName);
    }
  }

  /**
   * The responding defendant is the one who asserted a name. Only one defendant responds per journey, so fall
   * back to the sole defendant when a case has just one.
   */
  private findRespondingDefendant(parties: PartyNames[]): PartyNames | undefined {
    const defendants = parties.filter(party => party.role === 'DEFENDANT');
    const withAssertion = defendants.filter(defendant => defendant.defendantNameAssertion);
    if (withAssertion.length === 1) {
      return withAssertion[0];
    }
    return defendants.length === 1 ? defendants[0] : undefined;
  }

  /** Surfaces the dispatched / still-pending packs so a QA can tie the check to real letter ids. */
  private describePacks(report: CaseNameReport, defendant: PartyNames): string[] {
    const lines: string[] = [];
    const own = report.defencePacks.filter(pack => pack.recipientPartyId === defendant.partyId);
    if (own.length) {
      lines.push('  defence packs posted to this defendant:');
      own.forEach(pack =>
        lines.push(`    letterId=${pack.letterId} status=${pack.status} addressedTo='${pack.recipientCoversheetName}'`)
      );
    } else if (report.pendingDefencePacks.length) {
      const names = report.pendingDefencePacks.map(recipient => recipient.recipientName).join(', ');
      lines.push(`  defence pack not posted yet; pending recipients: ${names}`);
    } else {
      lines.push('  no defence pack posted yet (bulk print may be off on this environment)');
    }
    return lines;
  }
}
