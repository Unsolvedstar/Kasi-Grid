// The street's sound. A calm street is an open chord; risk pulls it out of tune; an outage brings a slow low throb.
// Everything is generated on the phone (no audio files), so it costs no data and works offline.
export function createHum() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  const ac = new AC()
  const master = ac.createGain(); master.gain.value = 0
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
  lp.connect(master); master.connect(ac.destination)
  const root = 110
  const voices = [1, 1.5, 2, 3].map((ratio, i) => {
    const o = ac.createOscillator(); o.type = i === 3 ? 'sine' : 'triangle'; o.frequency.value = root * ratio
    const g = ac.createGain(); g.gain.value = [.5, .3, .22, .08][i]
    o.connect(g); g.connect(lp); o.start()
    return { o, ratio }
  })
  const lfo = ac.createOscillator(); lfo.frequency.value = .4
  const depth = ac.createGain(); depth.gain.value = 0
  lfo.connect(depth); depth.connect(master.gain); lfo.start()
  return {
    ac,
    set(mood) {
      const now = ac.currentTime
      voices.forEach((v, i) => {
        v.o.detune.setTargetAtTime(i === 0 ? 0 : (i % 2 ? 1 : -1) * mood * 55 * i, now, .4) // out of tune with risk
        v.o.frequency.setTargetAtTime(root * v.ratio * (1 - mood * .08), now, .6) // and sinking
      })
      lp.frequency.setTargetAtTime(1100 - mood * 700, now, .5)
      lfo.frequency.setTargetAtTime(.4 + mood * 1.4, now, .5)
      depth.gain.setTargetAtTime(mood * .035, now, .5)
      master.gain.setTargetAtTime(.06, now, .5)
    },
    stop() {
      master.gain.setTargetAtTime(0, ac.currentTime, .2)
      setTimeout(() => { try { voices.forEach((v) => v.o.stop()); lfo.stop(); ac.close() } catch { /* already closed */ } }, 600)
    },
  }
}

// A heartbeat you can feel with the phone in a pocket: calm = one soft beat, risk = double, outage = long hard pulse.
export const heartbeat = (mood) => {
  if (!navigator.vibrate) return false
  navigator.vibrate(mood >= .8 ? [400, 120, 400] : mood >= .35 ? [60, 90, 60] : [40])
  return true
}
