module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    timeout: 30000,
    wait: 1000,
    runners: ['axe', 'htmlcs'],
    chromeLaunchConfig: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    ignore: [
      // Ignore specific rules if needed (document why)
      // Example: 'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'
    ],
  },
  urls: [
    {
      url: 'http://localhost:3209/',
      screenCapture: './pa11y-screenshots/home.png',
    },
    {
      url: 'http://localhost:3209/nest-journey/step1',
      screenCapture: './pa11y-screenshots/nest-journey-step1.png',
    },
    {
      url: 'http://localhost:3209/nest-journey/step2',
      screenCapture: './pa11y-screenshots/nest-journey-step2.png',
      actions: [
        'navigate to http://localhost:3209/nest-journey/step1',
        'check field input[value="yes"]',
        'click element button[type="submit"]',
        'wait for url to be http://localhost:3209/nest-journey/step2',
      ],
    },
    {
      url: 'http://localhost:3209/nest-journey/step3',
      screenCapture: './pa11y-screenshots/nest-journey-step3.png',
      actions: [
        'navigate to http://localhost:3209/nest-journey/step1',
        'check field input[value="yes"]',
        'click element button[type="submit"]',
        'wait for url to be http://localhost:3209/nest-journey/step2',
        'set field input[name="name"] to Test User',
        'click element button[type="submit"]',
        'wait for url to be http://localhost:3209/nest-journey/step3',
      ],
    },
    {
      url: 'http://localhost:3209/nest-journey/confirmation',
      screenCapture: './pa11y-screenshots/nest-journey-confirmation.png',
      actions: [
        'navigate to http://localhost:3209/nest-journey/step1',
        'check field input[value="yes"]',
        'click element button[type="submit"]',
        'wait for url to be http://localhost:3209/nest-journey/step2',
        'set field input[name="name"] to Test User',
        'click element button[type="submit"]',
        'wait for url to be http://localhost:3209/nest-journey/step3',
        'check field input[value="confirm"]',
        'click element button[type="submit"]',
        'wait for url to be http://localhost:3209/nest-journey/confirmation',
      ],
    },
    {
      url: 'http://localhost:3209/dashboard',
      screenCapture: './pa11y-screenshots/dashboard.png',
    },
  ],
};
