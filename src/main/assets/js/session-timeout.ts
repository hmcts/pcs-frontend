export function initSessionTimeout(): void {
  const body = document.body;
  const sessionTimeoutMinutes = parseInt(body.dataset.sessionTimeout!, 10);
  const sessionWarningMinutes = parseInt(body.dataset.sessionWarning!, 10);
  const sessionCheckIntervalSeconds = parseInt(body.dataset.sessionCheckInterval!, 10);

  // modal elements
  const modalContainer = document.getElementById('timeout-modal-container');
  const modal = document.getElementById('timeout-modal') as HTMLDialogElement;
  const countdownElement = document.getElementById('countdown-timer');
  const continueButton = document.getElementById('timeout-modal-close-button');
  const announcer = document.getElementById('timeout-modal-announcer');

  // inert container for background content
  const inertSelector = modalContainer?.dataset.inertContainer;
  const inertContainer = inertSelector ? (document.querySelector(inertSelector) as HTMLElement) : null;

  // translations from data attributes
  const srWarning = modalContainer?.dataset.srWarning;
  const srMinuteSingular = modalContainer?.dataset.srMinuteSingular;
  const srMinutePlural = modalContainer?.dataset.srMinutePlural;

  let lastActivity = Date.now();
  let warningShown = false;
  let countdownInterval: number | null = null;
  let lastFocusedElement: HTMLElement | null = null;
  let lastAnnouncedMinute = -1;

  // show modal
  const showModal = () => {
    if (!modalContainer || !modal) {
      return;
    }

    lastFocusedElement = document.activeElement as HTMLElement;

    // disable background content
    if (inertContainer) {
      (inertContainer as HTMLElement & { inert: boolean }).inert = true;
    }

    // prevent body scroll
    body.classList.add('modal-open');

    // show modal container and dialog element
    modalContainer.removeAttribute('hidden');

    if (modal.showModal) {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }

    modal.focus();
    warningShown = true;

    // announce to screen readers
    if (announcer && srWarning) {
      announcer.textContent = srWarning;
    }

    // start countdown
    startCountdown();
  };

  // hide modal
  const hideModal = () => {
    if (!modalContainer || !modal) {
      return;
    }

    // hide modal dialog and container
    if (modal.close) {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }

    modalContainer.setAttribute('hidden', 'hidden');

    // restore background content
    if (inertContainer) {
      (inertContainer as HTMLElement & { inert: boolean }).inert = false;
    }

    // restore body scroll
    body.classList.remove('modal-open');

    // restore focus to previous element
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }

    // clear screen reader announcer
    if (announcer) {
      announcer.textContent = '';
    }

    warningShown = false;
    lastAnnouncedMinute = -1;
    stopCountdown();
  };

  // start countdown timer
  const startCountdown = () => {
    if (!countdownElement) {
      return;
    }

    const warningTimeSeconds = sessionWarningMinutes * 60;
    let secondsRemaining = warningTimeSeconds;

    const updateCountdown = () => {
      if (secondsRemaining <= 0) {
        window.location.replace('/logout');
        return;
      }

      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;

      if (minutes > 0 && seconds > 0) {
        countdownElement.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        countdownElement.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        countdownElement.textContent = `${seconds} second${seconds !== 1 ? 's' : ''}`;
      }

      // announce minute changes to screen readers
      if (minutes !== lastAnnouncedMinute && secondsRemaining % 60 === 0 && announcer) {
        lastAnnouncedMinute = minutes;
        const template = minutes === 1 ? srMinuteSingular : srMinutePlural;
        if (template) {
          announcer.textContent = template.replace('%{count}', minutes.toString());
        }
      }

      secondsRemaining--;
    };

    // update immediately
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

  // Check session status
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

  // escape key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && warningShown) {
      e.preventDefault();
      if (continueButton) {
        continueButton.click();
      }
    }
  });

  // track activity
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
    document.addEventListener(event, resetActivity, { passive: true });
  });

  // first check immediately
  checkSessionStatus();

  // check at configurable interval
  setInterval(checkSessionStatus, sessionCheckIntervalSeconds * 1000);
}
