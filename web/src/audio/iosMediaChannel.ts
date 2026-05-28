/**
 * Routes Web Audio through the iOS media playback channel so audio is
 * audible when the hardware mute switch is on. Call synchronously from a
 * user gesture before Tone.start().
 */

interface NavigatorWithAudioSession extends Navigator {
  audioSession?: { type: string };
}

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function getAudioContextClass(): typeof AudioContext | undefined {
  const win = window as WindowWithWebkitAudio;
  return win.AudioContext ?? win.webkitAudioContext;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const hasTouch = navigator.maxTouchPoints > 0;
  const hasWebAudio =
    typeof window !== 'undefined' && getAudioContextClass() !== undefined;
  return hasTouch && hasWebAudio;
}

/** Feross unmute-ios-audio sample-rate-matched silent WAV data URI. */
function createSilentWavDataUri(sampleRate: number): string {
  const arrayBuffer = new ArrayBuffer(10);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint32(0, sampleRate, true);
  dataView.setUint32(4, sampleRate, true);
  dataView.setUint16(8, 1, true);

  const missingCharacters = window
    .btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .slice(0, 13);

  return (
    'data:audio/wav;base64,UklGRisAAABXQVZFZm10IBAAAAABAAEA' +
    `${missingCharacters}AgAZGF0YQcAAACAgICAgICAAAA=`
  );
}

function setPlaybackAudioSession(): boolean {
  const nav = navigator as NavigatorWithAudioSession;
  if (!nav.audioSession) return false;
  nav.audioSession.type = 'playback';
  return true;
}

function playWebAudioBlip(): boolean {
  try {
    const AudioCtx = getAudioContextClass();
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);

    if (ctx.state === 'running') {
      return true;
    }

    source.disconnect(ctx.destination);
    void ctx.close();
    return false;
  } catch {
    return false;
  }
}

let silentAudio: HTMLAudioElement | null = null;
let hasUnlocked = false;
let unlockInFlight: Promise<void> | null = null;

function logUnlockOutcome(details: {
  audioSession: boolean;
  htmlPlay: 'ok' | 'fail' | 'skipped';
  webAudioBlip: boolean;
}): void {
  console.info('[iosMediaChannel]', details);
}

function ensureSilentHtmlAudio(): HTMLAudioElement {
  if (silentAudio) return silentAudio;

  const AudioCtx = getAudioContextClass();
  const sampleRate = AudioCtx ? new AudioCtx().sampleRate : 44100;

  silentAudio = document.createElement('audio');
  silentAudio.setAttribute('x-webkit-airplay', 'deny');
  silentAudio.setAttribute('playsinline', '');
  silentAudio.setAttribute('webkit-playsinline', 'true');
  silentAudio.preload = 'auto';
  silentAudio.loop = true;
  silentAudio.src = createSilentWavDataUri(sampleRate);
  silentAudio.style.display = 'none';
  document.body.appendChild(silentAudio);
  silentAudio.load();
  return silentAudio;
}

function destroySilentHtmlAudio(): void {
  if (!silentAudio) return;
  silentAudio.pause();
  silentAudio.removeAttribute('src');
  silentAudio.load();
  silentAudio.remove();
  silentAudio = null;
}

function startUnlock(): Promise<void> {
  const audioSessionSet = setPlaybackAudioSession();
  const webAudioBlip = playWebAudioBlip();
  const audio = ensureSilentHtmlAudio();

  const onSuccess = () => {
    hasUnlocked = true;
    logUnlockOutcome({
      audioSession: audioSessionSet,
      htmlPlay: 'ok',
      webAudioBlip,
    });
  };

  const onFailure = () => {
    destroySilentHtmlAudio();
    logUnlockOutcome({
      audioSession: audioSessionSet,
      htmlPlay: 'fail',
      webAudioBlip,
    });
    if (audioSessionSet || webAudioBlip) {
      hasUnlocked = true;
      return;
    }
    throw new Error('iOS media channel unlock failed');
  };

  const playResult = audio.play();
  if (playResult !== undefined && typeof playResult.then === 'function') {
    return playResult.then(onSuccess).catch(onFailure);
  }

  try {
    onSuccess();
    return Promise.resolve();
  } catch {
    onFailure();
    return Promise.reject(new Error('iOS media channel unlock failed'));
  }
}

/**
 * Start unlock synchronously inside a user gesture (audioSession, play(), blip).
 */
export function unlockIosMediaChannel(): void {
  if (hasUnlocked) return;

  if (!isIosDevice()) {
    hasUnlocked = true;
    return;
  }

  if (!unlockInFlight) {
    unlockInFlight = startUnlock().finally(() => {
      unlockInFlight = null;
    });
  }
}

/**
 * Resolves when the silent HTML loop is playing or unlock is not needed.
 */
export function waitForIosMediaChannel(): Promise<void> {
  if (hasUnlocked) return Promise.resolve();

  if (!isIosDevice()) {
    hasUnlocked = true;
    return Promise.resolve();
  }

  if (!unlockInFlight) {
    unlockIosMediaChannel();
  }

  return unlockInFlight ?? Promise.resolve();
}
