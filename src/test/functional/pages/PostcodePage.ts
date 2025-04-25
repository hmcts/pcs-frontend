// src/pages/PostcodePage.ts

import { Locator, Page, expect } from '@playwright/test';

export class PostcodePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly label: Locator;
  readonly postcodeInput: Locator;
  readonly submitButton: Locator;
  readonly courtTableCaption: Locator;
  readonly courtTableHeaders: Locator;
  readonly courtTableRowHeader: Locator;
  readonly courtTableRowCell: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.label = page.locator('label[for="postcode"]');
    this.postcodeInput = page.locator('input[name="postcode"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.courtTableCaption = page.locator('caption');
    this.courtTableHeaders = page.locator('.govuk-table__head .govuk-table__header');
    this.courtTableRowHeader = page.locator('.govuk-table__body .govuk-table__row th.govuk-table__header');
    this.courtTableRowCell = page.locator('.govuk-table__body .govuk-table__row td.govuk-table__cell');
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async verifyPostcodeForm() {
    await expect(this.heading).toHaveText('Postcode Page');
    await expect(this.postcodeInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.label).toBeVisible();
    await expect(this.label).toHaveText('Please enter your postcode');
  }

  async submitPostcode(postcode: string) {
    const [request] = await Promise.all([
      this.page.waitForRequest(req => req.url().includes('/postcode') && req.method() === 'POST'),
      this.postcodeInput.fill(postcode),
      this.submitButton.click()
    ]);
    return request;
  }

  async verifyCourtTable() {
    await this.page.waitForSelector('tbody.govuk-table__body > tr.govuk-table__row');
    await expect(this.courtTableCaption).toHaveText('Courts');
    await expect(this.courtTableHeaders.nth(0)).toHaveText('Court Venue Id');
    await expect(this.courtTableHeaders.nth(1)).toHaveText('Court Name');
    await expect(this.courtTableRowHeader).toHaveText('40827');
    await expect(this.courtTableRowCell).toHaveText('Central London County Court');
  }
}
