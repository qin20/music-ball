import { Midi, Track } from '@tonejs/midi'

/* =========================================================
 *                     🔠 Type Definitions
 * ========================================================= */

export type SerializedNote = {
  originIndex: number;
  durationTicks: number
  midi: number
  noteOffVelocity: number
  ticks: number
  velocity: number
  bars: number
  duration: number
  name: string
  octave: number
  pitch: string
  time: number
}

/* =========================================================
 *                 🎹 Helper: MIDI → 音名 / 唱名
 * ========================================================= */

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const SOLFEGE_MAP: Record<string,string> = {
  C:'do','C#':'do#',D:'re','D#':'re#',E:'mi',F:'fa','F#':'fa#',
  G:'sol','G#':'sol#',A:'la','A#':'la#',B:'ti'
}
function midiToNames(midi: number) {
  const note = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return { pitch: `${note}${octave}`, solfege: SOLFEGE_MAP[note] }
}

/* =========================================================
 *           📅  Parse & Serialize MIDI  Tracks
 * ========================================================= */

export function serializeNotes(notes: Track['notes']): SerializedNote[] {
  return notes.map((n, i) => ({
    originIndex   : i,
    durationTicks : n.durationTicks,
    midi          : n.midi,
    noteOffVelocity: n.noteOffVelocity,
    ticks         : n.ticks,
    velocity      : n.velocity,
    bars          : (n.bars as unknown) as number,
    duration      : n.duration,
    name          : n.name,
    octave        : n.octave,
    pitch         : n.pitch,
    time          : n.time
  }))
}

export function getMainTrackIndex(tracks: Track[]): number {
  return tracks
    .map((t,i)=>({
      i,
      score: !t.notes.length
        ? -Infinity
        : t.notes.length*10 - Math.abs(
            t.notes.reduce((s,n)=>s+n.midi,0)/t.notes.length - 64
          )
    }))
    .sort((a,b)=>b.score-a.score)[0].i
}

export function filterUnrelatedNotes(
  notes: SerializedNote[],
  options: {
    minVelocity?: number
    pitchRange?: [number, number]
    excludeNames?: string[]
  } = {}
): SerializedNote[] {
  const {
    minVelocity = 0.2,
    pitchRange = [60, 84],
    excludeNames = [],
  } = options

  return notes.filter(n =>
    n.velocity >= minVelocity &&
    n.midi >= pitchRange[0] &&
    n.midi <= pitchRange[1] &&
    !excludeNames.includes(n.name)
  )
}

export function mergeChordsToSingleNotes(ns:SerializedNote[],th=0.03){
  const sorted=[...ns].sort((a,b)=>a.time-b.time)
  const out:SerializedNote[]=[];let bucket:SerializedNote[]=[]
  const flush=()=>{
    if(!bucket.length) return
    const avgMidi=Math.round(bucket.reduce((s,n)=>s+n.midi,0)/bucket.length)
    const avgVel=bucket.reduce((s,n)=>s+n.velocity,0)/bucket.length
    const midDur=bucket.map(n=>n.duration).sort((a,b)=>a-b)[Math.floor(bucket.length/2)]
    out.push({...bucket[0],...midiToNames(avgMidi),midi:avgMidi,velocity:avgVel,duration:midDur})
  }
  for(const n of sorted){
    if(!bucket.length||Math.abs(n.time-bucket[bucket.length-1].time)<=th) bucket.push(n)
    else{ flush(); bucket=[n] }
  }
  flush()
  return out
}

export function filterDenseNotes(ns:SerializedNote[],minDelta=0.12){
  const res:SerializedNote[]=[];let last=-Infinity
  for(const n of [...ns].sort((a,b)=>a.time-b.time)){
    if(n.time-last>=minDelta){res.push(n);last=n.time}
  }
  return res
}

export const normalizeDurations=(ns:SerializedNote[],dMs=250)=>
  ns.map(n=>({...n,duration:dMs/1000}))

export function limitLongGaps(
  ns: SerializedNote[],
  maxGapMs = 2000
): SerializedNote[] {
  const sorted = [...ns].sort((a,b)=>a.time-b.time)
  let trimAcc = 0
  for(let i=1;i<sorted.length;i++){
    const gap = (sorted[i].time - sorted[i-1].time) - trimAcc
    const gapMs = gap * 1000
    if (gapMs > maxGapMs) {
      const trim = (gapMs - maxGapMs)/1000
      trimAcc += trim
    }
    sorted[i].time -= trimAcc
  }
  return sorted
}

/* =========================================================
 *        🔄  SerializedNote[]  →  MidiNote[]
 * ========================================================= */

export function parseMidiNoteFromNotes(ns: SerializedNote[]): MidiNote[] {
  if(!ns.length) return []
  const PRE_SHIFT_MS = 500
  const shift = Math.max(0, ns[0].time*1000 - PRE_SHIFT_MS)/1000
  const evts:MidiNote[]=[];let cur=0
  ns.forEach((n,i)=>{
    const start = (n.time-shift)*1000
    const delta = i===0 ? start : start - evts[i-1].time
    cur += delta
    evts.push({ delta, time:cur, midi:n.midi, ...midiToNames(n.midi),
      duration:n.duration*1000, velocity:n.velocity, originIndex: n.originIndex })
  })
  return evts
}

/* =========================================================
 *                🚀  Entry: Extract Main Notes
 * ========================================================= */

export async function getMainTrack(input: File|ArrayBuffer) {
  const buffer = input instanceof File ? await input.arrayBuffer() : input
  const midi =  new Midi(buffer)
  const tracks = midi.tracks;
  return tracks[getMainTrackIndex(tracks)];
}

/**
 * 获取小球动画事件和音乐事件
 * @param tracks
 * @param disabledIndexes
 * @returns
 */
export function getTrackEvents(track: Track, disabledIndexes: number[] = []): MidiNote[] {
  let notes    = serializeNotes(track.notes)

  notes = notes.filter((n, i) => !disabledIndexes.includes(i));

  console.log('origin', parseMidiNoteFromNotes(notes))

  notes = filterUnrelatedNotes(notes, {
    minVelocity: .3,
    pitchRange: [-Infinity, Infinity],
    excludeNames: [],
  })
  // notes = mergeChordsToSingleNotes(notes, 0.03)
  // notes = filterDenseNotes(notes, 0.12)
  // notes = normalizeDurations(notes, 250)
  notes = limitLongGaps(notes, 1500)


  const events = parseMidiNoteFromNotes(notes);
  console.log(events);

  return events;
}
