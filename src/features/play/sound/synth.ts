import type { Cue } from './cues'

/** One synthesised note: frequency (Hz), start offset and length (s). */
export interface Note {
  type: OscillatorType
  freq: number
  /** Frequency at the end of the note, for a slide; defaults to `freq`. */
  freqEnd?: number
  at: number
  duration: number
}

/** Short, mid-range cues: they survive the audio compression of video calls. */
export const CUE_NOTES: Record<Cue, Note[]> = {
  correct: [
    { type: 'sine', freq: 660, at: 0, duration: 0.12 },
    { type: 'sine', freq: 990, at: 0.11, duration: 0.18 },
  ],
  wrong: [{ type: 'square', freq: 160, freqEnd: 110, at: 0, duration: 0.35 }],
  tick: [{ type: 'triangle', freq: 1000, at: 0, duration: 0.04 }],
  gameOver: [
    { type: 'triangle', freq: 784, at: 0, duration: 0.18 },
    { type: 'triangle', freq: 659, at: 0.18, duration: 0.18 },
    { type: 'triangle', freq: 523, at: 0.36, duration: 0.18 },
    { type: 'triangle', freq: 392, at: 0.54, duration: 0.45 },
  ],
}

const VOLUME = 0.25
const ATTACK = 0.008
const RELEASE = 0.03

export interface SoundEngine {
  /** Creates or resumes the audio context; call from a user gesture (autoplay rules). */
  unlock(): void
  play(cue: Cue): void
}

export const silentEngine: SoundEngine = { unlock() {}, play() {} }

type MinimalContext = Pick<
  AudioContext,
  'currentTime' | 'destination' | 'state' | 'resume' | 'createOscillator' | 'createGain'
>

/** Web Audio synth; no sound until `unlock()` has created the context. */
export function createSoundEngine(
  createContext: () => MinimalContext = () => new AudioContext(),
): SoundEngine {
  let context: MinimalContext | null = null
  let output: GainNode | null = null

  return {
    unlock() {
      try {
        context ??= createContext()
        if (!output) {
          output = context.createGain()
          output.gain.value = VOLUME
          output.connect(context.destination)
        }
        if (context.state === 'suspended') void context.resume().catch(() => {})
      } catch {
        // No Web Audio: stay silent.
      }
    },
    play(cue) {
      if (!context || !output) return
      const start = context.currentTime + 0.01
      for (const note of CUE_NOTES[cue]) {
        const osc = context.createOscillator()
        const env = context.createGain()
        const t0 = start + note.at
        const t1 = t0 + note.duration
        osc.type = note.type
        osc.frequency.setValueAtTime(note.freq, t0)
        if (note.freqEnd) osc.frequency.linearRampToValueAtTime(note.freqEnd, t1)
        env.gain.setValueAtTime(0, t0)
        env.gain.linearRampToValueAtTime(1, t0 + ATTACK)
        env.gain.setValueAtTime(1, Math.max(t0 + ATTACK, t1 - RELEASE))
        env.gain.linearRampToValueAtTime(0, t1)
        osc.connect(env)
        env.connect(output)
        osc.start(t0)
        osc.stop(t1 + 0.01)
      }
    },
  }
}

/** The real engine where Web Audio exists, otherwise a silent one (tests, old browsers). */
export function defaultSoundEngine(): SoundEngine {
  return typeof AudioContext === 'undefined' ? silentEngine : createSoundEngine()
}
