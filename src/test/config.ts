// better handling of unhandled exceptions
process.on('unhandledRejection', reason => {
  throw reason;
});

export const config = {
  TEST_URL: process.env.TEST_URL || 'http://localhost:3209',
  helpers: {},
};

config.helpers = {
  Playwright: {
    url: config.TEST_URL,
  },
};
