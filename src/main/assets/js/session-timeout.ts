export function initSessionTimeout(): void {
  const body = document.body;
  const sessionTimeoutMinutes = parseInt(body.dataset.sessionTimeout!, 10);
  const sessionWarningMinutes = parseInt(body.dataset.sessionWarning!, 10);
  const sessionCheckIntervalSeconds = parseInt(body.dataset.sessionCheckInterval!, 10);

  // modal elements
  const modalContainer = document.getElementById('timeout-modal-container');
  const modal = modalContainer?.querySelector<HTMLElement>('#timeout-modal');
  const countdownTime = modalContainer?.querySelector<HTMLElement>('#countdown-time');
  const countdownMessage = modalContainer?.querySelector<HTMLElement>('#countdown-message');
  const timeoutAlert = modalContainer?.querySelector<HTMLElement>('#timeout-alert');
  const continueButton = modalContainer?.querySelector<HTMLElement>('#timeout-modal-close-button');

  const inertSelector = modalContainer?.dataset.inertContainer;
  const inertContainer = inertSelector ? document.querySelector<HTMLElement>(inertSelector) : null;

  let lastActivity = Date.now();
  let warningShown = false;
  let countdownInterval: number | null = null;

  // translations from data attributes
  const {
    timeoutTitle,
    timeoutSubtitle,
    timeoutCaption,
    timeMinute,
    timeMinutes,
    timeSecond,
    timeSeconds,
    timeRemaining,
  } = modalContainer?.dataset ?? {};

  // format time helper
  const formatTime = (minutes: number, seconds: number): string => {
    const parts: string[] = [];

    if (minutes > 0) {
      const minuteLabel = minutes === 1 ? timeMinute : timeMinutes;
      parts.push(`${minutes} ${minuteLabel}`);
    }

    if (seconds > 0) {
      const secondLabel = seconds === 1 ? timeSecond : timeSeconds;
      parts.push(`${seconds} ${secondLabel}`);
    }

    return parts.join(' ');
  };

  // show modal
  const showModal = () => {
    if (!modalContainer || !modal) {
      return;
    }

    if (inertContainer) {
      (inertContainer as HTMLElement & { inert: boolean }).inert = true;
    }

    document.documentElement.classList.add('modal-open');

    modalContainer.removeAttribute('hidden');

    if (timeoutAlert) {
      timeoutAlert.textContent = `${timeoutTitle}. ${timeoutSubtitle} ${sessionWarningMinutes} ${timeMinutes}. ${timeoutCaption}`;
    }

    setTimeout(() => {
      modal.focus();
    }, 100);

    warningShown = true;

    startCountdown();
  };

  // hide modal
  const hideModal = () => {
    if (!modalContainer) {
      return;
    }

    if (inertContainer) {
      (inertContainer as HTMLElement & { inert: boolean }).inert = false;
    }

    document.documentElement.classList.remove('modal-open');

    modalContainer.setAttribute('hidden', 'hidden');

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

      updateVisualCountdown(secondsRemaining);

      if (secondsRemaining === warningTimeSeconds) {
        updateScreenReaderAnnouncement(`${timeoutSubtitle} ${warningTimeSeconds / 60} ${timeMinutes}.`);
      } else if (secondsRemaining > 0 && secondsRemaining < warningTimeSeconds && secondsRemaining % 60 === 0) {
        const minutes = secondsRemaining / 60;
        updateScreenReaderAnnouncement(`${formatTime(minutes, 0)} ${timeRemaining}`);
      }

      secondsRemaining--;
    };

    updateCountdown();

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
    if (!warningShown) {
      lastActivity = Date.now();
    }
  };

  // check session status
  const checkSessionStatus = () => {
    const inactiveMinutes = (Date.now() - lastActivity) / (1000 * 60);
    const timeUntilWarning = sessionTimeoutMinutes - sessionWarningMinutes;

    if (inactiveMinutes >= timeUntilWarning && !warningShown) {
      showModal();
    }

    if (inactiveMinutes >= sessionTimeoutMinutes) {
      window.location.replace('/logout');
    }
  };

  // stay signed in- button click
  if (continueButton) {
    continueButton.addEventListener('click', () => {
      fetch('/active')
        .then(response => {
          if (response.ok) {
            lastActivity = Date.now();
            hideModal();
          }
        })
        .catch(() => {
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
