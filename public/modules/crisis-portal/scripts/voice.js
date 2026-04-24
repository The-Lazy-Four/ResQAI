// ============================================
// ResQAI Crisis Portal - Voice System
// ============================================

let recognition = null;
let isListening = false;

/**
 * Initialize voice input
 * @param {HTMLInputElement} inputEl - the text input to fill
 * @param {HTMLButtonElement} micBtn - the mic button
 */
export function initVoice(inputEl, micBtn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Browser doesn't support it — disable button cleanly
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.title = 'Voice not supported in this browser';
      micBtn.classList.add('opacity-30', 'cursor-not-allowed');
    }
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (inputEl) {
      inputEl.value = transcript;
      // Trigger input event so any listeners fire
      inputEl.dispatchEvent(new Event('input'));
    }
    stopListening(micBtn);
  };

  recognition.onerror = () => {
    stopListening(micBtn);
  };

  recognition.onend = () => {
    stopListening(micBtn);
  };

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (isListening) {
        stopListening(micBtn);
        recognition.stop();
      } else {
        startListening(micBtn);
        recognition.start();
      }
    });
  }
}

function startListening(micBtn) {
  isListening = true;
  if (micBtn) {
    micBtn.classList.add('text-rose-400', 'animate-pulse');
    micBtn.title = 'Listening... click to stop';
  }
}

function stopListening(micBtn) {
  isListening = false;
  if (micBtn) {
    micBtn.classList.remove('text-rose-400', 'animate-pulse');
    micBtn.title = 'Voice input';
  }
}
