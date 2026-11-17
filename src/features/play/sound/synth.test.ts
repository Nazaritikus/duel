import { describe, expect, it, vi } from 'vitest'
import { loadMuted, saveMuted } from './muteStorage'
import { createSoundEngine, CUE_NOTES } from './synth'

function fakeContext(state: AudioContextState = 'suspended') {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  })
  const oscillators: { type: string; start: ReturnType<typeof vi.fn> }[] = []
  const context = {
    currentTime: 5,
    destination: {},
    state,
    resume: vi.fn(async () => {}),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn() })),
    createOscillator: vi.fn(() => {
      const osc = { type: '', frequency: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
      oscillators.push(osc)
      return osc
    }),
  }
  return { context, oscillators }
}

describe('createSoundEngine', () => {
  it('is silent until unlocked', () => {
    const create = vi.fn()
    const engine = createSoundEngine(create)
    engine.play('correct')
    expect(create).not.toHaveBeenCalled()
  })

  it('resumes a suspended context on unlock and schedules every note of a cue', () => {
    const { context, oscillators } = fakeContext()
    const engine = createSoundEngine(() => context as never)
    engine.unlock()
    expect(context.resume).toHaveBeenCalled()
    for (const cue of ['correct', 'wrong', 'tick', 'gameOver'] as const) {
      const before = oscillators.length
      engine.play(cue)
      expect(oscillators.length - before).toBe(CUE_NOTES[cue].length)
    }
    expect(oscillators[0].start).toHaveBeenCalledWith(expect.any(Number))
  })

  it('creates the context only once', () => {
    const { context } = fakeContext('running')
    const create = vi.fn(() => context as never)
    const engine = createSoundEngine(create)
    engine.unlock()
    engine.unlock()
    expect(create).toHaveBeenCalledTimes(1)
    expect(context.resume).not.toHaveBeenCalled()
  })

  it('stays silent when Web Audio is unavailable', () => {
    const engine = createSoundEngine(() => {
      throw new Error('no audio')
    })
    expect(() => {
      engine.unlock()
      engine.play('tick')
    }).not.toThrow()
  })
})

describe('mute storage', () => {
  it('remembers the choice and tolerates broken storage', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    } as Storage
    expect(loadMuted(storage)).toBe(false)
    saveMuted(true, storage)
    expect(loadMuted(storage)).toBe(true)
    data.set('duel.sound.v1', '{bad json')
    expect(loadMuted(storage)).toBe(false)
    expect(() =>
      saveMuted(true, {
        setItem: () => {
          throw new Error('full')
        },
      } as unknown as Storage),
    ).not.toThrow()
  })
})
