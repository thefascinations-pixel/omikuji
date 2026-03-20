export type FortuneTier = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶'

export type OmikujiEntry = {
  id: string
  fortune: FortuneTier
  weight: number
  summary: string
  sections: {
    love: string
    work: string
    money: string
    health: string
    travel: string
  }
  lucky: {
    color: string
    number: string
    item: string
  }
}

export type StoredFortune = {
  id: string
  drawnAt: string
  tokyoDateKey: string
}

export type MotionPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied'

export type ShrineWorld = {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  seasonLabel: string
  timeOfDay: 'morning' | 'day' | 'evening' | 'night'
  timeLabel: string
  title: string
  subtitle: string
  ambientNote: string
  motifs: string[]
  shellGradient: string
  shellGlow: string
  panelTint: string
  accentTint: string
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

type DeviceMotionPermissionCapable = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

const STORAGE_KEY = 'omikuji:last-drawn'
const FORTUNE_QUERY = 'fortune'
const TOKYO_TIME_ZONE = 'Asia/Tokyo'

export const badFortunes = new Set<FortuneTier>(['末吉', '凶'])

export const sectionLabels: Record<keyof OmikujiEntry['sections'], string> = {
  love: '恋愛',
  work: '仕事',
  money: '金運',
  health: '健康',
  travel: '旅路',
}

export const fortuneStyles: Record<
  FortuneTier,
  { badge: string; accent: string; chip: string }
> = {
  大吉: {
    badge: 'bg-gradient-to-r from-gold to-amber-200 text-ink',
    accent: 'from-gold/30 via-gold/10 to-transparent',
    chip: 'border-gold/40 bg-gold/10 text-ink',
  },
  中吉: {
    badge: 'bg-gradient-to-r from-[#E4BF69] to-[#F4E1B1] text-ink',
    accent: 'from-[#E4BF69]/30 via-[#E4BF69]/10 to-transparent',
    chip: 'border-[#E4BF69]/40 bg-[#E4BF69]/10 text-ink',
  },
  小吉: {
    badge: 'bg-gradient-to-r from-[#DD7A66] to-[#F4C5B8] text-charcoal',
    accent: 'from-[#DD7A66]/30 via-[#DD7A66]/10 to-transparent',
    chip: 'border-[#DD7A66]/40 bg-[#DD7A66]/10 text-charcoal',
  },
  吉: {
    badge: 'bg-gradient-to-r from-[#CE5F57] to-[#EDC6B9] text-charcoal',
    accent: 'from-[#CE5F57]/30 via-[#CE5F57]/10 to-transparent',
    chip: 'border-[#CE5F57]/40 bg-[#CE5F57]/10 text-charcoal',
  },
  末吉: {
    badge: 'bg-gradient-to-r from-[#A6583D] to-[#E4C6A7] text-paper',
    accent: 'from-[#A6583D]/30 via-[#A6583D]/10 to-transparent',
    chip: 'border-[#A6583D]/40 bg-[#A6583D]/10 text-ink',
  },
  凶: {
    badge: 'bg-gradient-to-r from-shrine-red to-[#6E231C] text-paper',
    accent: 'from-shrine-red/30 via-shrine-red/10 to-transparent',
    chip: 'border-shrine-red/40 bg-shrine-red/10 text-charcoal',
  },
}

export async function loadOmikujiDataset() {
  const response = await fetch('/data/omikuji_200_dataset.json')

  if (!response.ok) {
    throw new Error('Failed to load omikuji dataset')
  }

  return (await response.json()) as OmikujiEntry[]
}

export function pickRandomFortune(entries: OmikujiEntry[]) {
  const index = Math.floor(Math.random() * entries.length)
  return entries[index]
}

export function getTokyoDateKey(dateInput: string | Date = new Date()) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'

  return `${year}-${month}-${day}`
}

export function isSameTokyoDay(dateA: string, dateB: string | Date = new Date()) {
  return getTokyoDateKey(dateA) === getTokyoDateKey(dateB)
}

export function getTokyoWorld(dateInput: string | Date = new Date()): ShrineWorld {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOKYO_TIME_ZONE,
    month: 'numeric',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 12)

  const season =
    month >= 3 && month <= 5
      ? 'spring'
      : month >= 6 && month <= 8
        ? 'summer'
        : month >= 9 && month <= 11
          ? 'autumn'
          : 'winter'

  const timeOfDay =
    hour >= 5 && hour < 11
      ? 'morning'
      : hour >= 11 && hour < 16
        ? 'day'
        : hour >= 16 && hour < 19
          ? 'evening'
          : 'night'

  const seasonWorlds: Record<ShrineWorld['season'], Omit<ShrineWorld, 'timeOfDay' | 'timeLabel'>> = {
    spring: {
      season: 'spring',
      seasonLabel: '春詣',
      title: '桜の気配が漂う境内',
      subtitle: 'やわらかな光のなかで、今日の運勢が静かに姿を見せます。',
      ambientNote: '花びらの余韻が、言葉をやさしく受け止めてくれます。',
      motifs: ['桜', '花', '風'],
      shellGradient:
        'radial-gradient(circle at top, rgba(255,220,228,0.72), transparent 30%), radial-gradient(circle at bottom, rgba(212,175,55,0.14), transparent 28%), linear-gradient(180deg, #fff9f7 0%, #f7f0ee 46%, #f2e7e4 100%)',
      shellGlow: 'from-[#F7C8CF]/30 via-[#F7C8CF]/8 to-transparent',
      panelTint: 'bg-white/58 border-white/70',
      accentTint: 'from-[#F4D1D5]/60 via-white/15 to-transparent',
    },
    summer: {
      season: 'summer',
      seasonLabel: '夏詣',
      title: '青葉を抜ける涼しい風',
      subtitle: '夏の境内にある静けさのなかで、運勢がすっと届きます。',
      ambientNote: '水辺のような涼しさが、心を少し軽くしてくれます。',
      motifs: ['青葉', '風鈴', '水'],
      shellGradient:
        'radial-gradient(circle at top, rgba(168,221,223,0.48), transparent 30%), radial-gradient(circle at bottom, rgba(98,165,173,0.18), transparent 28%), linear-gradient(180deg, #f8fcfc 0%, #f2f7f5 44%, #e7efec 100%)',
      shellGlow: 'from-[#9FD7D4]/30 via-[#9FD7D4]/8 to-transparent',
      panelTint: 'bg-white/60 border-white/75',
      accentTint: 'from-[#BEE8E5]/55 via-white/15 to-transparent',
    },
    autumn: {
      season: 'autumn',
      seasonLabel: '秋詣',
      title: '紅葉が映える静かな参道',
      subtitle: '澄んだ空気のなかで、受け取る言葉がいっそう深く響きます。',
      ambientNote: '木々の色づきが、落ち着いた一日へと気持ちを導きます。',
      motifs: ['紅葉', '実り', '灯'],
      shellGradient:
        'radial-gradient(circle at top, rgba(230,173,120,0.5), transparent 30%), radial-gradient(circle at bottom, rgba(192,57,43,0.14), transparent 28%), linear-gradient(180deg, #fcf7f0 0%, #f6eee4 46%, #efe2d5 100%)',
      shellGlow: 'from-[#E7B07D]/30 via-[#E7B07D]/8 to-transparent',
      panelTint: 'bg-white/56 border-white/70',
      accentTint: 'from-[#E9C39E]/58 via-white/15 to-transparent',
    },
    winter: {
      season: 'winter',
      seasonLabel: '冬詣',
      title: '凛と澄んだ冬の社',
      subtitle: '冷たい空気に包まれながら、まっすぐな言葉を受け取る時間です。',
      ambientNote: '静まり返った空気が、心を整える余白をつくってくれます。',
      motifs: ['雪', '灯籠', '月'],
      shellGradient:
        'radial-gradient(circle at top, rgba(214,225,238,0.62), transparent 32%), radial-gradient(circle at bottom, rgba(130,154,180,0.16), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #f1f4f7 44%, #e8edf2 100%)',
      shellGlow: 'from-[#D6E1EE]/30 via-[#D6E1EE]/8 to-transparent',
      panelTint: 'bg-white/60 border-white/72',
      accentTint: 'from-[#DCE4ED]/56 via-white/15 to-transparent',
    },
  }

  const timeLabels: Record<ShrineWorld['timeOfDay'], string> = {
    morning: '朝の社',
    day: '昼の社',
    evening: '夕暮れの社',
    night: '夜の社',
  }

  const timeAtmosphere: Record<
    ShrineWorld['timeOfDay'],
    Pick<ShrineWorld, 'shellGradient' | 'shellGlow' | 'panelTint' | 'accentTint'>
  > = {
    morning: {
      shellGradient:
        'radial-gradient(circle at top, rgba(255,232,189,0.52), transparent 24%), radial-gradient(circle at bottom, rgba(212,175,55,0.12), transparent 28%), linear-gradient(180deg, rgba(255,250,242,0.9) 0%, rgba(248,242,234,0.88) 52%, rgba(240,233,225,0.9) 100%)',
      shellGlow: 'from-[#F6DDA7]/30 via-[#F6DDA7]/10 to-transparent',
      panelTint: 'bg-white/60 border-white/75',
      accentTint: 'from-[#F7E2B3]/60 via-white/15 to-transparent',
    },
    day: {
      shellGradient:
        'radial-gradient(circle at top, rgba(255,245,213,0.32), transparent 22%), radial-gradient(circle at bottom, rgba(192,57,43,0.08), transparent 28%), linear-gradient(180deg, rgba(250,247,242,0.95) 0%, rgba(247,243,238,0.92) 48%, rgba(239,233,225,0.94) 100%)',
      shellGlow: 'from-gold/20 via-gold/6 to-transparent',
      panelTint: 'bg-white/55 border-white/70',
      accentTint: 'from-[#F4DED0]/55 via-white/15 to-transparent',
    },
    evening: {
      shellGradient:
        'radial-gradient(circle at top, rgba(245,187,150,0.4), transparent 24%), radial-gradient(circle at bottom, rgba(192,57,43,0.14), transparent 32%), linear-gradient(180deg, rgba(251,244,238,0.96) 0%, rgba(244,234,224,0.94) 52%, rgba(232,220,210,0.95) 100%)',
      shellGlow: 'from-[#E6A679]/30 via-[#E6A679]/9 to-transparent',
      panelTint: 'bg-white/56 border-white/68',
      accentTint: 'from-[#EBC0A4]/60 via-white/12 to-transparent',
    },
    night: {
      shellGradient:
        'radial-gradient(circle at top, rgba(76,95,124,0.34), transparent 26%), radial-gradient(circle at bottom, rgba(212,175,55,0.12), transparent 24%), linear-gradient(180deg, rgba(239,241,245,0.98) 0%, rgba(230,234,240,0.96) 50%, rgba(220,225,233,0.98) 100%)',
      shellGlow: 'from-[#94A6C4]/28 via-[#94A6C4]/8 to-transparent',
      panelTint: 'bg-white/62 border-white/72',
      accentTint: 'from-[#C2CCDF]/58 via-white/12 to-transparent',
    },
  }

  const base = seasonWorlds[season]
  const time = timeAtmosphere[timeOfDay]

  return {
    ...base,
    ...time,
    timeOfDay,
    timeLabel: timeLabels[timeOfDay],
  }
}

export function saveStoredFortune(fortune: StoredFortune) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fortune))
}

export function loadStoredFortune() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredFortune
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function formatJapaneseDate(isoDate: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoDate))
}

export function getSharedFortuneId() {
  const params = new URLSearchParams(window.location.search)
  return params.get(FORTUNE_QUERY)
}

export function setSharedFortuneId(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set(FORTUNE_QUERY, id)
  window.history.replaceState({}, '', url)
  return url.toString()
}

export function clearSharedFortuneId() {
  const url = new URL(window.location.href)
  url.searchParams.delete(FORTUNE_QUERY)
  window.history.replaceState({}, '', url)
  return url.toString()
}

export function createShareText(entry: OmikujiEntry, drawnAt: string, shareUrl: string) {
  return [
    `今日のおみくじは「${entry.fortune}」`,
    entry.summary,
    `日付: ${formatJapaneseDate(drawnAt)}`,
    `恋愛: ${entry.sections.love}`,
    `仕事: ${entry.sections.work}`,
    `金運: ${entry.sections.money}`,
    `健康: ${entry.sections.health}`,
    `旅路: ${entry.sections.travel}`,
    `ラッキーカラー: ${entry.lucky.color}`,
    `ラッキーナンバー: ${entry.lucky.number}`,
    `ラッキーアイテム: ${entry.lucky.item}`,
    shareUrl,
  ].join('\n')
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

export function getMotionPermissionState(): MotionPermissionState {
  if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
    return 'unsupported'
  }

  const motionConstructor = DeviceMotionEvent as DeviceMotionPermissionCapable
  return typeof motionConstructor.requestPermission === 'function' ? 'prompt' : 'granted'
}

export async function requestMotionPermission() {
  if (typeof DeviceMotionEvent === 'undefined') return 'unsupported' as const

  const motionConstructor = DeviceMotionEvent as DeviceMotionPermissionCapable
  if (typeof motionConstructor.requestPermission !== 'function') return 'granted' as const

  const result = await motionConstructor.requestPermission()
  return result === 'granted' ? ('granted' as const) : ('denied' as const)
}

export function playBell(enabled: boolean) {
  if (!enabled) return

  const AudioCtor = window.AudioContext ?? window.webkitAudioContext
  if (!AudioCtor) return

  const context = new AudioCtor()
  const master = context.createGain()
  master.connect(context.destination)
  master.gain.setValueAtTime(0.0001, context.currentTime)
  master.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.03)
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.2)

  ;[1318.5, 1760, 2637].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = index === 0 ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18 / (index + 1.2), context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.95 + index * 0.08)

    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(context.currentTime + index * 0.02)
    oscillator.stop(context.currentTime + 1.1 + index * 0.08)
  })

  window.setTimeout(() => {
    void context.close()
  }, 1400)
}

export function vibrateLight() {
  if ('vibrate' in navigator) {
    navigator.vibrate([18, 28, 18])
  }
}
