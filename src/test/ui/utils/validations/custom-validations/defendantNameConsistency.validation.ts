import { Page, expect } from '@playwright/test';

import { PartyNames, getDefendantNameReport } from '../../actions/custom-actions/defendantNameDivergenceAPI.action';
import { IValidation, validationData, validationRecord } from '../../interfaces';

/**
 * HDPI-7686: the coversheet on the responding defendant's own copy of their defence pack must carry the name
 * that defendant supplied through the response journey.
 *
 * A defence pack goes to every party on the claim, and each recipient's coversheet is addressed with that
 * recipient's own name (RecipientAddressResolver.resolveDisplayName). So the only copy whose coversheet is
 * expected to show the responding defendant's name is the copy addressed to them - identified here by the
 * recorded PackDocumentRef.self on the enclosed defence form. Copies addressed to the claimant or to a
 * co-defendant who has not yet responded legitimately carry a different name, and "Persons unknown" for a
 * co-defendant the claimant could not name is correct rather than a defect.
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

    /*
     * Which defendant responds is decided by the access code the citizen validated against, and that is not
     * always defendant 1 - so the responder is identified by their own copy of the pack: the one whose enclosed
     * defence form is recorded as self.
     */
    const ownPack = report.defencePacks.find(pack => pack.documents.some(document => document.self));
    if (!ownPack) {
      throw new Error(
        `No defence pack enclosing the recipient's own defence form was found. ` +
          `Packs: ${JSON.stringify(report.defencePacks)}`
      );
    }

    const responder = report.parties.find(party => party.partyId === ownPack.recipientPartyId);
    if (!responder) {
      throw new Error(`Pack recipient ${ownPack.recipientPartyId} is not among the reported parties`);
    }

    // The journey did record the name the defendant typed, on the party record itself.
    expect(
      responder.coversheetName,
      `The responding defendant's party record should carry the name they supplied. Party: ${JSON.stringify(responder)}`
    ).toBe(expectedName);

    // The defect as reported: their own coversheet carries a different name.
    expect(
      ownPack.recipientCoversheetName,
      `HDPI-7686: letter ${ownPack.letterId} is the responding defendant's own copy of the defence pack, so its ` +
        `coversheet should be addressed to '${expectedName}'. Pack: ${JSON.stringify(ownPack)}`
    ).toBe(expectedName);

    this.logOtherRecipients(report, responder);
  }

  /**
   * The other recipients' coversheets are the ones the ticket's download step also returns, so print them to
   * make clear which letter each observed name belongs to.
   */
  private logOtherRecipients(
    report: NonNullable<ReturnType<typeof getDefendantNameReport>>,
    responder: PartyNames
  ): void {
    report.defencePacks
      .filter(pack => pack.recipientPartyId !== responder.partyId)
      .forEach(pack => {
        const recipient = report.parties.find(party => party.partyId === pack.recipientPartyId);
        console.log(
          `Defence pack ${pack.letterId} also went to ${recipient?.role ?? 'unknown'} rank ${recipient?.rank ?? '?'} ` +
            `addressed to '${pack.recipientCoversheetName}' (enclosing ${pack.documents.length} document(s), ` +
            `self=${pack.documents.some(document => document.self)})`
        );
      });
  }
}
