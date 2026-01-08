// Helper function to format time with proper pluralization
function formatTime(minutes: number, seconds: number): string {
  if (minutes > 0 && seconds > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

export function initSessionTimeout(): void {
  const body = document.body;
  const sessionTimeoutMinutes = parseInt(body.dataset.sessionTimeout!, 10);
  const sessionWarningMinutes = parseInt(body.dataset.sessionWarning!, 10);
  const sessionCheckIntervalSeconds = parseInt(body.dataset.sessionCheckInterval!, 10);

  // modal elements
  const modalContainer = document.getElementById('timeout-modal-container');
  const modal = document.getElementById('timeout-modal');
  const countdownTime = document.getElementById('countdown-time');
  const countdownMessage = document.getElementById('countdown-message');
  const timeoutAlert = document.getElementById('timeout-alert');
  const continueButton = document.getElementById('timeout-modal-close-button');

  // inert container for background content
  const inertSelector = modalContainer?.dataset.inertContainer;
  const inertContainer = inertSelector ? (document.querySelector(inertSelector) as HTMLElement) : null;

  let lastActivity = Date.now();
  let warningShown = false;
  let countdownInterval: number | null = null;

  // show modal
  const showModal = () => {
    if (!modalContainer || !modal) {
      return;
    }

    // disable background content
    if (inertContainer) {
      (inertContainer as HTMLElement & { inert: boolean }).inert = true;
    }

    // prevent body scroll
    body.classList.add('modal-open');

    // show modal container
    modalContainer.removeAttribute('hidden');

    // announce all content immediately via status region
    if (timeoutAlert) {
      timeoutAlert.textContent = `You'll be signed out soon. For your security, you'll be signed out in ${sessionWarningMinutes} minutes. Your previous answers have been saved.`;
    }

    // focus modal after brief delay to allow announcement
    setTimeout(() => {
      modal.focus();
    }, 100);

    warningShown = true;

    // start countdown
    startCountdown();
  };

  // hide modal
  const hideModal = () => {
    if (!modalContainer) {
      return;
    }

    // restore background content
    if (inertContainer) {
      (inertContainer as HTMLElement & { inert: boolean }).inert = false;
    }

    // restore body scroll
    body.classList.remove('modal-open');

    modalContainer.setAttribute('hidden', 'hidden');

    // clear the announcement region
    if (timeoutAlert) {
      timeoutAlert.textContent = '';
    }

    warningShown = false;
    stopCountdown();
  };

  // update visual countdown display (every second)
  const updateVisualCountdown = (secondsRemaining: number) => {
    if (!countdownTime) {
      return;
    }

    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    countdownTime.textContent = formatTime(minutes, seconds);
  };

  // update screen reader announcement (only at intervals)
  const updateScreenReaderAnnouncement = (text: string) => {
    if (countdownMessage) {
      countdownMessage.textContent = text;
    }
  };

  // start countdown timer
  const startCountdown = () => {
    if (!countdownTime || !countdownMessage) {
      return;
    }

    const warningTimeSeconds = sessionWarningMinutes * 60;
    let secondsRemaining = warningTimeSeconds;

    const updateCountdown = () => {
      if (secondsRemaining <= 0) {
        window.location.replace('/logout');
        return;
      }

      // update visual countdown EVERY second
      updateVisualCountdown(secondsRemaining);

      // announcements every minute
      // first announcement at 5 minutes
      if (secondsRemaining === warningTimeSeconds) {
        updateScreenReaderAnnouncement(
          `For your security, you'll be signed out in ${warningTimeSeconds / 60} minutes.`
        );
      }
      //  "X minutes remaining"
      else if (secondsRemaining > 0 && secondsRemaining < warningTimeSeconds && secondsRemaining % 60 === 0) {
        const minutes = secondsRemaining / 60;
        updateScreenReaderAnnouncement(`${formatTime(minutes, 0)} remaining`);
      }

      secondsRemaining--;
    };

    updateCountdown();

    // update every second
    countdownInterval = window.setInterval(updateCountdown, 1000);
  };

  // stop countdown timer
  const stopCountdown = () => {
    if (countdownInterval !== null) {
      window.clearInterval(countdownInterval);
      countdownInterval = null;
    }
  };

  // reset - user must click button
  const resetActivity = () => {
    // reset timer if modal is NOT shown
    if (!warningShown) {
      lastActivity = Date.now();
    }
  };

  // check session status
  const checkSessionStatus = () => {
    const inactiveMinutes = (Date.now() - lastActivity) / (1000 * 60);
    const timeUntilWarning = sessionTimeoutMinutes - sessionWarningMinutes;

    // warning
    if (inactiveMinutes >= timeUntilWarning && !warningShown) {
      showModal();
    }

    // timeout
    if (inactiveMinutes >= sessionTimeoutMinutes) {
      window.location.replace('/logout');
    }
  };

  // stay signed in- button click
  if (continueButton) {
    continueButton.addEventListener('click', () => {
      // backend to extend server session
      fetch('/active')
        .then(response => {
          if (response.ok) {
            lastActivity = Date.now();
            hideModal();
          }
        })
        .catch(() => {
          // reset client timer
          lastActivity = Date.now();
          hideModal();
        });
    });
  }

  // track activity
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
    document.addEventListener(event, resetActivity, { passive: true });
  });

  // first check immediately
  checkSessionStatus();

  // check at configurable interval
  setInterval(checkSessionStatus, sessionCheckIntervalSeconds * 1000);
}
