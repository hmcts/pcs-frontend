import { Page } from '@playwright/test';

import { Base } from './base';

export class ClaimFormPageObjects extends Base {
  readonly startButton = this.page.getByRole('button', { name: 'Start' });
  readonly yesRadioButton = this.page.getByRole('radio', { name: 'Yes' });
  readonly rentArrearsG8 = this.page.getByRole('checkbox', { name: 'Rent arrears (ground 8)' });
  readonly rentArrearsG10 = this.page.getByRole('checkbox', { name: 'Any rent arrears (ground 10)' });
  readonly arrearsG11 = this.page.getByRole('checkbox', { name: 'Persistent arrears (ground 11)' });
  readonly continueButton = this.page.getByRole('button', { name: 'Continue' });
  readonly submitButton = this.page.getByRole('button', { name: 'Submit' });

  constructor(page: Page) {
    super(page);
  }
}
