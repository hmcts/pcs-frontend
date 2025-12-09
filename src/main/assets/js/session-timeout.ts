export function initSessionTimeout(): void {
  const body = document.body;
  const sessionTimeoutMinutes = parseInt(body.dataset.sessionTimeout || '6', 10);
  const sessionWarningMinutes = parseInt(body.dataset.sessionWarning || '5', 10);

  // modal elements
  const modalContainer = document.getElementById('timeout-modal-container');
  const modal = document.getElementById('timeout-modal');
  const countdownElement = document.getElementById('countdown-timer');
  const continueButton = document.getElementById('timeout-modal-close-button');

  let lastActivity = Date.now();
  let warningShown = false;
  let countdownInterval: number | null = null;

  // show modal
  const showModal = () => {
    if (!modalContainer || !modal) {
      return;
    }

    modalContainer.removeAttribute('hidden');
    modal.focus();
    warningShown = true;

    // start countdown
    startCountdown();
  };

  // hide modal
  const hideModal = () => {
    if (!modalContainer) {
      return;
    }

    modalContainer.setAttribute('hidden', 'hidden');
    warningShown = false;
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

  // track activity
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
    document.addEventListener(event, resetActivity, { passive: true });
  });

  // first check immediately
  checkSessionStatus();

  // check every 10 seconds
  setInterval(checkSessionStatus, 10000);
}
