import {Page} from "@playwright/test";
import {Base} from "../../base";

export class LandingPage extends Base {
  readonly heading = this.page.locator("govuk-heading-xl");

  constructor(page: Page) {
    super(page);
  }
}
