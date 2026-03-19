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
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

const STORAGE_KEY = 'omikuji:last-drawn'
const FORTUNE_QUERY = 'fortune'

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
