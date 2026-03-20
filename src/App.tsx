import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import {
  badFortunes,
  clearSharedFortuneId,
  copyToClipboard,
  createShareText,
  formatJapaneseDate,
  fortuneStyles,
  getMotionPermissionState,
  getSharedFortuneId,
  getTokyoDateKey,
  loadOmikujiDataset,
  loadStoredFortune,
  pickRandomFortune,
  playBell,
  requestMotionPermission,
  saveStoredFortune,
  sectionLabels,
  setSharedFortuneId,
  vibrateLight,
  type MotionPermissionState,
  type OmikujiEntry,
} from './lib/omikuji'

type Phase = 'idle' | 'drawing' | 'revealed' | 'tied'

type SavedPreview = {
  entry: OmikujiEntry
  drawnAt: string
}

const particles = [
  { top: '7%', left: '10%', size: '10px', delay: '0s', duration: '9s' },
  { top: '14%', left: '76%', size: '8px', delay: '1.2s', duration: '12s' },
  { top: '24%', left: '34%', size: '6px', delay: '0.7s', duration: '8s' },
  { top: '38%', left: '82%', size: '12px', delay: '2.2s', duration: '11s' },
  { top: '48%', left: '18%', size: '8px', delay: '1.6s', duration: '10s' },
  { top: '63%', left: '74%', size: '10px', delay: '0.4s', duration: '13s' },
  { top: '72%', left: '22%', size: '7px', delay: '2.8s', duration: '9s' },
  { top: '86%', left: '60%', size: '9px', delay: '1.1s', duration: '12s' },
]

function App() {
  const [entries, setEntries] = useState<OmikujiEntry[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeFortune, setActiveFortune] = useState<OmikujiEntry | null>(null)
  const [savedPreview, setSavedPreview] = useState<SavedPreview | null>(null)
  const [sharedViewId, setSharedViewId] = useState<string | null>(null)
  const [drawnAt, setDrawnAt] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSoundOn, setIsSoundOn] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [motionPermission, setMotionPermission] =
    useState<MotionPermissionState>('unsupported')
  const [isExporting, setIsExporting] = useState(false)

  const drawTimeoutRef = useRef<number | null>(null)
  const drawActionRef = useRef<() => void>(() => undefined)
  const shareCardRef = useRef<HTMLDivElement | null>(null)

  const todayKey = getTokyoDateKey()
  const hasTodayFortune = Boolean(
    savedPreview && getTokyoDateKey(savedPreview.drawnAt) === todayKey,
  )
  const isViewingTodayFortune = Boolean(
    activeFortune &&
      savedPreview &&
      drawnAt &&
      savedPreview.entry.id === activeFortune.id &&
      savedPreview.drawnAt === drawnAt &&
      hasTodayFortune,
  )
  const canDrawToday = !hasTodayFortune
  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const dataset = await loadOmikujiDataset()
        if (cancelled) return

        setEntries(dataset)
        setMotionPermission(getMotionPermissionState())

        const stored = loadStoredFortune()
        const sharedId = getSharedFortuneId()

        if (stored) {
          const storedEntry = dataset.find((item) => item.id === stored.id)
          if (storedEntry) {
            setSavedPreview({
              entry: storedEntry,
              drawnAt: stored.drawnAt,
            })
          }
        }

        if (sharedId) {
          const sharedEntry = dataset.find((item) => item.id === sharedId)

          if (sharedEntry) {
            setActiveFortune(sharedEntry)
            setSharedViewId(sharedId)
            setPhase('revealed')
            setDrawnAt(stored?.id === sharedEntry.id ? stored.drawnAt : new Date().toISOString())
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError('おみくじの準備に少し時間がかかっています。ページを再読み込みしてください。')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
      if (drawTimeoutRef.current) {
        window.clearTimeout(drawTimeoutRef.current)
      }
    }
  }, [])

  const revealFortune = (entry: OmikujiEntry) => {
    const drawnTimestamp = new Date().toISOString()
    setActiveFortune(entry)
    setSharedViewId(null)
    setSavedPreview({ entry, drawnAt: drawnTimestamp })
    setDrawnAt(drawnTimestamp)
    setPhase('revealed')
    setShareMessage('本日のおみくじを授かりました。')
    saveStoredFortune({
      id: entry.id,
      drawnAt: drawnTimestamp,
      tokyoDateKey: getTokyoDateKey(drawnTimestamp),
    })
    setSharedFortuneId(entry.id)
  }

  const handleDraw = () => {
    if (!entries.length || phase === 'drawing') return

    if (hasTodayFortune) {
      if (savedPreview) {
        setActiveFortune(savedPreview.entry)
        setDrawnAt(savedPreview.drawnAt)
        setPhase('revealed')
        setSharedViewId(null)
        setSharedFortuneId(savedPreview.entry.id)
      }
      setShareMessage('今日はすでにおみくじを引いています。')
      return
    }

    const selected = pickRandomFortune(entries)
    setPhase('drawing')
    setShareMessage('')
    playBell(isSoundOn)
    vibrateLight()

    if (drawTimeoutRef.current) {
      window.clearTimeout(drawTimeoutRef.current)
    }

    drawTimeoutRef.current = window.setTimeout(() => {
      revealFortune(selected)
    }, 1080)
  }

  drawActionRef.current = handleDraw

  useEffect(() => {
    if (motionPermission !== 'granted') return

    let lastMagnitude = 0
    let lastShakeAt = 0

    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity
      if (!acceleration) return

      const magnitude =
        Math.abs(acceleration.x ?? 0) +
        Math.abs(acceleration.y ?? 0) +
        Math.abs(acceleration.z ?? 0)

      const delta = Math.abs(magnitude - lastMagnitude)
      lastMagnitude = magnitude

      if (delta > 18 && Date.now() - lastShakeAt > 2200) {
        lastShakeAt = Date.now()
        drawActionRef.current()
      }
    }

    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [motionPermission])

  const handleRequestMotion = async () => {
    try {
      const result = await requestMotionPermission()
      setMotionPermission(result)
      setShareMessage(
        result === 'granted'
          ? '端末を振って引けるようになりました。'
          : 'モーションの許可がないため、引くボタンでご利用ください。',
      )
    } catch {
      setMotionPermission('denied')
      setShareMessage('モーションの許可が取得できませんでした。')
    }
  }

  const handleShareLink = async () => {
    if (!activeFortune || !drawnAt) return

    const shareUrl = setSharedFortuneId(activeFortune.id)
    const shareText = createShareText(activeFortune, drawnAt, shareUrl)

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'おみくじ',
          text: `${activeFortune.fortune} | ${activeFortune.summary}`,
          url: shareUrl,
        })
        setShareMessage('リンクをシェアしました。')
        return
      }

      await copyToClipboard(shareText)
      setShareMessage('おみくじの内容をコピーしました。')
    } catch {
      setShareMessage('シェアを完了できませんでした。もう一度お試しください。')
    }
  }

  const handleExportCard = async () => {
    if (!activeFortune || !drawnAt || !shareCardRef.current) return

    setIsExporting(true)

    try {
      const blob = await toBlob(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f7f3ee',
      })

      if (!blob) {
        throw new Error('Share image export failed')
      }

      const filename = `omikuji-${activeFortune.id}.png`
      const file = new File([blob], filename, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: 'おみくじ',
          files: [file],
        })
        setShareMessage('おみくじ画像をシェアしました。')
        return
      }

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setShareMessage('おみくじ画像を保存しました。')
    } catch {
      setShareMessage('画像の書き出しに失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

  const handleTie = () => {
    if (!activeFortune || !isViewingTodayFortune || !badFortunes.has(activeFortune.fortune)) {
      return
    }

    setPhase('tied')
    setShareMessage('悪い運気をここに結びました。')
    clearSharedFortuneId()
  }

  const showSavedPreview = () => {
    if (!savedPreview) return
    setActiveFortune(savedPreview.entry)
    setDrawnAt(savedPreview.drawnAt)
    setPhase('revealed')
    setShareMessage('')
    setSharedViewId(null)
    setSharedFortuneId(savedPreview.entry.id)
  }

  const resetLanding = () => {
    setPhase('idle')
    setShareMessage('')
    setActiveFortune(null)
    setDrawnAt(null)
    setSharedViewId(null)
    clearSharedFortuneId()
  }

  const accent = activeFortune ? fortuneStyles[activeFortune.fortune] : fortuneStyles.吉

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-charcoal">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.17),transparent_35%),radial-gradient(circle_at_bottom,rgba(192,57,43,0.12),transparent_28%),linear-gradient(180deg,#faf7f2_0%,#f7f3ee_42%,#f2ece5_100%)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-70" />

      {particles.map((particle, index) => (
        <span
          key={`${particle.top}-${particle.left}`}
          className="pointer-events-none absolute rounded-full bg-gradient-to-b from-gold/30 to-shrine-red/10 blur-[1px] animate-drift"
          style={{
            top: particle.top,
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            opacity: 0.25 + index * 0.03,
          }}
        />
      ))}

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-6 sm:px-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-serif text-sm tracking-[0.35em] text-shrine-red/80">OMIKUJI</p>
            <h1 className="mt-2 font-serif text-[2.6rem] leading-none text-charcoal">おみくじ</h1>
            <p className="mt-3 text-sm leading-6 text-ink/80">今日の運勢を引いてみましょう</p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-[11px] text-ink/75">
              {todayKey}
            </span>
            <button
              type="button"
              onClick={() => setIsSoundOn((current) => !current)}
              className="ripple-button rounded-full border border-charcoal/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink shadow-sm backdrop-blur"
            >
              {isSoundOn ? '音あり' : '消音'}
            </button>
          </div>
        </header>

        <section className="relative flex flex-1 flex-col">
          <div className="pointer-events-none absolute inset-x-6 top-16 h-40 rounded-full bg-gradient-to-b from-shrine-red/10 to-transparent blur-3xl" />

          <div className="relative rounded-[2rem] border border-white/60 bg-white/55 p-5 shadow-slip backdrop-blur">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-shrine-red/70">Daily Shrine Draw</p>
                <p className="mt-2 text-sm text-ink/75">
                  {hasTodayFortune
                    ? '本日分はすでに授かっています。結果を大切に持ち帰りましょう。'
                    : motionPermission === 'granted'
                      ? '引くボタンでも、端末を軽く振っても、おみくじを引けます。'
                      : '一日一回、静かに今日の運勢を受け取りましょう。'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-serif text-lg text-shrine-red animate-float">
                鈴
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-paper-deep bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,243,238,0.96))] px-5 py-6">
              <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accent.accent}`} />

              {isLoading ? (
                <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
                  <div className="h-12 w-12 rounded-full border-2 border-gold/50 border-t-shrine-red animate-spin" />
                  <p className="text-sm text-ink/70">おみくじを整えています...</p>
                </div>
              ) : loadError ? (
                <div className="flex min-h-[24rem] flex-col items-center justify-center gap-5 text-center">
                  <p className="font-serif text-2xl text-shrine-red">少し休憩中</p>
                  <p className="text-sm leading-7 text-ink/75">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="ripple-button rounded-full bg-shrine-red px-6 py-3 text-sm font-medium text-paper shadow-glow"
                  >
                    再読み込み
                  </button>
                </div>
              ) : (
                <div className="relative min-h-[24rem]">
                  {phase === 'idle' && (
                    <div className="flex min-h-[24rem] flex-col items-center justify-center text-center animate-fade-up">
                      <div className="relative mb-6">
                        <div className="mx-auto h-28 w-20 rounded-t-[1.6rem] bg-shrine-red shadow-glow" />
                        <div className="absolute left-1/2 top-10 h-28 w-16 -translate-x-1/2 rounded-[1.1rem] border border-paper-deep bg-paper shadow-slip" />
                      </div>

                      <p className="font-serif text-3xl text-charcoal">
                        {hasTodayFortune ? '本日の一枚' : '今日の一枚'}
                      </p>
                      <p className="mt-3 max-w-[17rem] text-sm leading-7 text-ink/80">
                        {hasTodayFortune
                          ? '今日のおみくじはすでに引いてあります。静かな余韻とともに、受け取った言葉を見返してみましょう。'
                          : '深呼吸をひとつ。心を静かにしてから、そっと運勢を引いてみましょう。'}
                      </p>

                      <button
                        type="button"
                        onClick={hasTodayFortune ? showSavedPreview : handleDraw}
                        className="ripple-button mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-shrine-red px-10 py-4 font-medium text-paper shadow-glow transition-transform duration-200 active:scale-[0.98]"
                      >
                        {hasTodayFortune ? '今日の運勢を見る' : '引く'}
                      </button>

                      {motionPermission === 'prompt' && !hasTodayFortune && (
                        <button
                          type="button"
                          onClick={handleRequestMotion}
                          className="mt-4 rounded-full border border-charcoal/10 bg-white/80 px-5 py-3 text-sm text-ink/85 backdrop-blur"
                        >
                          振って引く準備をする
                        </button>
                      )}

                      {motionPermission === 'denied' && (
                        <p className="mt-4 max-w-[16rem] text-xs leading-6 text-ink/65">
                          端末のモーションは未許可です。引くボタンならそのまま使えます。
                        </p>
                      )}

                      {savedPreview && !hasTodayFortune && (
                        <button
                          type="button"
                          onClick={showSavedPreview}
                          className="mt-5 rounded-full border border-charcoal/10 bg-white/75 px-5 py-3 text-sm text-ink/85 backdrop-blur"
                        >
                          前回のおみくじを見る
                        </button>
                      )}

                      <p className="mt-6 text-xs leading-6 text-ink/60">
                        オフライン対応済み。ホーム画面にも追加できます。
                      </p>
                    </div>
                  )}

                  {phase === 'drawing' && (
                    <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
                      <div className="relative mb-6 h-60 w-24">
                        <div className="absolute inset-x-0 top-0 mx-auto h-24 w-24 rounded-t-[2rem] bg-shrine-red shadow-glow" />
                        <div className="absolute bottom-0 left-1/2 h-44 w-20 -translate-x-1/2 rounded-[1.4rem] border border-paper-deep bg-paper shadow-slip animate-paper-draw" />
                      </div>

                      <p className="font-serif text-3xl text-charcoal">運勢を授かっています</p>
                      <p className="mt-3 text-sm leading-7 text-ink/75">
                        鈴の音が落ち着いたら、紙札がゆっくり現れます。
                      </p>
                    </div>
                  )}

                  {activeFortune && phase !== 'idle' && (
                    <div className={phase === 'tied' ? 'animate-fold-away origin-top' : 'animate-fade-up'}>
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full px-4 py-2 text-sm font-medium shadow-sm ${fortuneStyles[activeFortune.fortune].badge}`}
                        >
                          {activeFortune.fortune}
                        </span>
                        <div className="flex flex-wrap justify-end gap-2">
                          {drawnAt && (
                            <span className="rounded-full border border-charcoal/10 bg-white/70 px-3 py-1 text-xs text-ink/70">
                              {formatJapaneseDate(drawnAt)}
                            </span>
                          )}
                          {sharedViewId && (
                            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-ink/70">
                              共有されたおみくじ
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-paper-deep/90 bg-paper/95 p-5 shadow-slip">
                        <p className="text-xs uppercase tracking-[0.25em] text-shrine-red/65">Fortune Revealed</p>
                        <p className="mt-3 font-serif text-[2.4rem] leading-none text-charcoal">
                          {activeFortune.fortune}
                        </p>
                        <p className="mt-4 text-base leading-8 text-ink">{activeFortune.summary}</p>

                        <div className="mt-6 grid gap-3">
                          {Object.entries(activeFortune.sections).map(([key, value], index) => (
                            <div
                              key={key}
                              className="rounded-[1.2rem] border border-charcoal/8 bg-white/65 px-4 py-3 animate-fade-up"
                              style={{ animationDelay: `${120 + index * 80}ms` }}
                            >
                              <p className="text-xs tracking-[0.2em] text-shrine-red/70">
                                {sectionLabels[key as keyof OmikujiEntry['sections']]}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-ink">{value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 rounded-[1.2rem] border border-gold/20 bg-gradient-to-r from-gold/10 via-white/80 to-shrine-red/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-shrine-red/70">Lucky Signs</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-2 text-sm ${fortuneStyles[activeFortune.fortune].chip}`}
                            >
                              色: {activeFortune.lucky.color}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-2 text-sm ${fortuneStyles[activeFortune.fortune].chip}`}
                            >
                              数字: {activeFortune.lucky.number}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-2 text-sm ${fortuneStyles[activeFortune.fortune].chip}`}
                            >
                              品: {activeFortune.lucky.item}
                            </span>
                          </div>
                        </div>
                      </div>

                      {phase === 'revealed' && (
                        <>
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={handleShareLink}
                              className="ripple-button rounded-full bg-shrine-red px-5 py-3 text-sm font-medium text-paper shadow-glow"
                            >
                              リンク共有
                            </button>
                            <button
                              type="button"
                              onClick={handleExportCard}
                              disabled={isExporting}
                              className="ripple-button rounded-full border border-charcoal/10 bg-white/80 px-5 py-3 text-sm font-medium text-ink disabled:opacity-60"
                            >
                              {isExporting ? '書き出し中...' : '画像保存'}
                            </button>

                            {badFortunes.has(activeFortune.fortune) && isViewingTodayFortune && (
                              <button
                                type="button"
                                onClick={handleTie}
                                className="ripple-button col-span-2 rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-medium text-ink"
                              >
                                結ぶ
                              </button>
                            )}

                            {canDrawToday && (
                              <button
                                type="button"
                                onClick={handleDraw}
                                className="ripple-button col-span-2 rounded-full border border-charcoal/10 bg-white/70 px-5 py-3 text-sm font-medium text-ink"
                              >
                                今日の運勢を引く
                              </button>
                            )}

                            {!canDrawToday && !isViewingTodayFortune && savedPreview && (
                              <button
                                type="button"
                                onClick={showSavedPreview}
                                className="ripple-button col-span-2 rounded-full border border-charcoal/10 bg-white/70 px-5 py-3 text-sm font-medium text-ink"
                              >
                                今日の運勢を見る
                              </button>
                            )}
                          </div>

                          {isViewingTodayFortune && (
                            <p className="mt-4 text-center text-xs leading-6 text-ink/65">
                              一日一回のおみくじです。次の一枚は東京時間で日付が変わると引けます。
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {phase === 'tied' && (
                    <div className="absolute inset-x-2 bottom-2 rounded-[1.4rem] border border-paper-deep bg-white/88 p-5 text-center shadow-slip animate-fade-up">
                      <p className="font-serif text-2xl text-charcoal">悪い運気はここに結びました</p>
                      <p className="mt-3 text-sm leading-7 text-ink/75">
                        今日は静かに整える日。結んだぶんだけ、心も少し軽くなっています。
                      </p>
                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          onClick={showSavedPreview}
                          className="ripple-button flex-1 rounded-full bg-shrine-red px-5 py-3 text-sm font-medium text-paper shadow-glow"
                        >
                          今日の運勢を見る
                        </button>
                        <button
                          type="button"
                          onClick={resetLanding}
                          className="ripple-button flex-1 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-medium text-ink"
                        >
                          戻る
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {savedPreview && phase === 'idle' && (
            <div className="mt-4 rounded-[1.5rem] border border-white/60 bg-white/55 px-5 py-4 shadow-sm backdrop-blur animate-fade-up">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-shrine-red/70">
                    {hasTodayFortune ? 'Today' : 'Last Drawn'}
                  </p>
                  <p className="mt-2 font-serif text-xl text-charcoal">{savedPreview.entry.fortune}</p>
                  <p className="mt-1 text-xs text-ink/70">{formatJapaneseDate(savedPreview.drawnAt)}</p>
                </div>
                <p className="max-w-[13rem] text-right text-sm leading-6 text-ink/75">
                  {savedPreview.entry.summary}
                </p>
              </div>
            </div>
          )}

          <footer className="mt-5 px-2 text-center text-xs leading-6 text-ink/65">
            {shareMessage ? shareMessage : '静かな時間を大切に、必要な言葉だけを受け取るおみくじです。'}
          </footer>
        </section>
      </div>

      {activeFortune && drawnAt && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-[-99999px] top-0 w-[1080px]"
        >
          <div
            ref={shareCardRef}
            className="overflow-hidden rounded-[56px] bg-[#f7f3ee] p-12 text-charcoal"
          >
            <div className="rounded-[44px] border border-[#ead8c6] bg-[linear-gradient(180deg,#fffdf9,#f7f3ee)] p-12 shadow-[0_24px_80px_rgba(91,59,39,0.16)]">
              <div className="mb-10 flex items-start justify-between">
                <div>
                  <p className="font-serif text-[30px] tracking-[0.35em] text-shrine-red/80">OMIKUJI</p>
                  <p className="mt-4 font-serif text-[88px] leading-none text-charcoal">
                    {activeFortune.fortune}
                  </p>
                </div>
                <div
                  className={`rounded-full px-8 py-4 text-[28px] font-medium ${fortuneStyles[activeFortune.fortune].badge}`}
                >
                  {formatJapaneseDate(drawnAt)}
                </div>
              </div>

              <p className="max-w-[860px] font-serif text-[42px] leading-[1.7] text-ink">
                {activeFortune.summary}
              </p>

              <div className="mt-10 grid grid-cols-2 gap-5">
                {Object.entries(activeFortune.sections).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-[30px] border border-charcoal/8 bg-white/80 px-7 py-6"
                  >
                    <p className="text-[22px] tracking-[0.25em] text-shrine-red/70">
                      {sectionLabels[key as keyof OmikujiEntry['sections']]}
                    </p>
                    <p className="mt-3 text-[27px] leading-[1.8] text-ink">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[32px] border border-gold/20 bg-gradient-to-r from-gold/10 via-white/80 to-shrine-red/5 px-7 py-6">
                <p className="text-[22px] tracking-[0.25em] text-shrine-red/70">LUCKY SIGNS</p>
                <div className="mt-4 flex flex-wrap gap-3 text-[26px] text-ink">
                  <span className="rounded-full border border-gold/30 bg-white/70 px-5 py-3">
                    色: {activeFortune.lucky.color}
                  </span>
                  <span className="rounded-full border border-gold/30 bg-white/70 px-5 py-3">
                    数字: {activeFortune.lucky.number}
                  </span>
                  <span className="rounded-full border border-gold/30 bg-white/70 px-5 py-3">
                    品: {activeFortune.lucky.item}
                  </span>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between text-[22px] text-ink/70">
                <span>一日一回、静かに受け取るおみくじ</span>
                <span>omikuji</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
