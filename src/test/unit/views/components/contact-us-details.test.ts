import * as path from 'path';
import * as nunjucks from 'nunjucks';

describe('contact-us-details.njk', () => {
  let nunjucksEnv: nunjucks.Environment;

  beforeAll(() => {
    // Set up nunjucks environment similar to how it's configured in the app
    // Use process.cwd() which should be the project root when tests run
    const projectRoot = process.cwd();
    const viewsPath = path.join(projectRoot, 'src', 'main', 'views');
    const stepsPath = path.join(projectRoot, 'src', 'main', 'steps');
    const govukPath = path.join(projectRoot, 'node_modules', 'govuk-frontend');

    nunjucksEnv = nunjucks.configure([viewsPath, stepsPath, govukPath], {
      autoescape: true,
      watch: false,
    });
  });

  describe('rendering', () => {
    it('should render the contact us details component', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toBeTruthy();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should contain the summary text "Contact us for help"', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Contact us for help');
    });

    it('should contain email section heading', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Email');
    });

    it('should contain telephone section heading', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Telephone');
    });

    it('should contain the telephone number', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('0300 123 7050');
    });

    it('should contain telephone hours information', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Monday to Friday, 8.30am to 5pm');
    });

    it('should contain link to Find a court or tribunal service', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Find a court or tribunal service');
      expect(html).toContain('https://www.find-court-tribunal.service.gov.uk/');
    });

    it('should contain link to call charges information', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Find out about call charges');
      expect(html).toContain('https://www.gov.uk/call-charges');
    });

    it('should contain instructions about finding local court email', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('Money');
      expect(html).toContain('Housing');
    });
  });

  describe('accessibility and security', () => {
    it('should have external links with target="_blank"', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('target="_blank"');
    });

    it('should have external links with rel="noopener noreferrer"', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('rel="noopener noreferrer"');
    });

    it('should have proper link structure for Find a court service', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // Check that the link has all required attributes
      expect(html).toMatch(/<a[^>]*href="https:\/\/www\.find-court-tribunal\.service\.gov\.uk\/"[^>]*>/);
      expect(html).toMatch(/<a[^>]*target="_blank"[^>]*>/);
      expect(html).toMatch(/<a[^>]*rel="noopener noreferrer"[^>]*>/);
    });

    it('should have proper link structure for call charges', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // Check that the link has all required attributes
      expect(html).toMatch(/<a[^>]*href="https:\/\/www\.gov\.uk\/call-charges"[^>]*>/);
      expect(html).toMatch(/<a[^>]*target="_blank"[^>]*>/);
      expect(html).toMatch(/<a[^>]*rel="noopener noreferrer"[^>]*>/);
    });
  });

  describe('HTML structure', () => {
    it('should use GOV.UK details component', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // GOV.UK details component should render with proper classes
      expect(html).toMatch(/govuk-details/);
    });

    it('should have proper heading structure', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // Should contain h3 headings for Email and Telephone sections
      expect(html).toMatch(/<h3[^>]*class="govuk-heading-s[^"]*"[^>]*>Email<\/h3>/);
      expect(html).toMatch(/<h3[^>]*class="govuk-heading-s[^"]*"[^>]*>Telephone<\/h3>/);
    });

    it('should have proper paragraph structure', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // Should contain paragraphs with govuk-body class
      expect(html).toMatch(/<p[^>]*class="govuk-body"[^>]*>/);
    });

    it('should have proper link classes', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // Links should have govuk-link class
      expect(html).toMatch(/<a[^>]*class="govuk-link"[^>]*>/);
    });
  });

  describe('content validation', () => {
    it('should contain "(opens in new tab)" text for external links', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      expect(html).toContain('(opens in new tab)');
    });

    it('should contain instructions about selecting Money and Housing categories', () => {
      const html = nunjucksEnv.render('components/contact-us-details.njk');

      // Check for Money and Housing (quotes may be HTML entities or different quote styles)
      expect(html).toMatch(/Money/);
      expect(html).toMatch(/Housing/);
      expect(html).toContain('category');
      expect(html).toContain('select the');
    });
  });
});
