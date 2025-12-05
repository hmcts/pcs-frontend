export function initSessionTimeout(): void {
  const body = document.body;
  const totalIdleTime = parseInt(body.dataset.sessionTimeout || '90', 10);
  const warningTime = parseInt(body.dataset.sessionWarning || '5', 10);

  let lastActivity = Date.now();
  let warningShown = false;

  const resetActivity = () => {
    lastActivity = Date.now();
    warningShown = false;
  };

  const checkSessionStatus = () => {
    const inactiveMinutes = (Date.now() - lastActivity) / (1000 * 60);
    const timeUntilWarning = totalIdleTime - warningTime;

    // warning
    if (inactiveMinutes >= timeUntilWarning && !warningShown) {
      console.log(`Session warning: ${warningTime} minutes until timeout`);
      warningShown = true;
    }

    // timeout
    if (inactiveMinutes >= totalIdleTime) {
      console.log('Session timed out - redirecting to login');
      window.location.href = '/login';
    }
  };

  // track activity
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
    document.addEventListener(event, resetActivity, { passive: true });
  });

  // check every 30 seconds
  setInterval(checkSessionStatus, 30000);
}
