import type { AlertItem, AlertQueue } from '@stream/alerts'

export interface TtsSpeakRequest {
  text: string
  alert?: AlertItem
}

export interface TtsProvider {
  speak(request: TtsSpeakRequest): Promise<void>
  cancel?(): void
}

export interface TtsEngineOptions {
  provider: TtsProvider
  /** 포함되면  Speaks 하지 않음 */
  blockedWords?: string[]
  /** donation 금액 임계값. 미설정이면 모두 */
  minDonationAmount?: number
  /** speakText 없는 알림 스킵. 기본 true */
  requireSpeakText?: boolean
}

/**
 * 알림용 TTS 어댑터.
 * 브라우저 SpeechSynthesis / 외부 API는 TtsProvider로 주입합니다.
 */
export class TtsEngine {
  private readonly provider: TtsProvider
  private readonly blockedWords: string[]
  private readonly minDonationAmount?: number
  private readonly requireSpeakText: boolean
  private readonly queue: string[] = []
  private speaking = false
  private detach: (() => void) | undefined

  constructor(options: TtsEngineOptions) {
    this.provider = options.provider
    this.blockedWords = (options.blockedWords ?? []).map((w) => w.toLowerCase())
    this.minDonationAmount = options.minDonationAmount
    this.requireSpeakText = options.requireSpeakText ?? true
  }

  attachAlertQueue(alerts: AlertQueue): () => void {
    this.detach?.()
    this.detach = alerts.onChange((alert) => {
      if (alert) void this.enqueueAlert(alert)
    })
    return () => {
      this.detach?.()
      this.detach = undefined
    }
  }

  async enqueueAlert(alert: AlertItem): Promise<void> {
    if (alert.kind === 'donation' && this.minDonationAmount != null) {
      if ((alert.amount ?? 0) < this.minDonationAmount) return
    }
    const text = alert.speakText
    if (!text) {
      if (this.requireSpeakText) return
      return
    }
    await this.enqueue(text, alert)
  }

  async enqueue(text: string, alert?: AlertItem): Promise<void> {
    const normalized = text.trim()
    if (!normalized) return
    const lower = normalized.toLowerCase()
    if (this.blockedWords.some((w) => lower.includes(w))) return
    this.queue.push(normalized)
    // alert는 현재 발화 메타로만 쓰고, 큐에는 텍스트만 넣습니다.
    void alert
    await this.pump()
  }

  cancel(): void {
    this.queue.length = 0
    this.provider.cancel?.()
    this.speaking = false
  }

  dispose(): void {
    this.detach?.()
    this.cancel()
  }

  private async pump(): Promise<void> {
    if (this.speaking) return
    const text = this.queue.shift()
    if (!text) return
    this.speaking = true
    try {
      await this.provider.speak({ text })
    } finally {
      this.speaking = false
      await this.pump()
    }
  }
}

/** 브라우저 speechSynthesis 프로바이더. window 없는 환경에서는 no-op. */
export function createBrowserSpeechProvider(
  speech: SpeechSynthesis | undefined = globalThis.speechSynthesis,
): TtsProvider {
  return {
    speak({ text }) {
      return new Promise((resolve, reject) => {
        if (!speech) {
          resolve()
          return
        }
        const utter = new SpeechSynthesisUtterance(text)
        utter.onend = () => resolve()
        utter.onerror = () => reject(new Error('speechSynthesis failed'))
        speech.speak(utter)
      })
    },
    cancel() {
      speech?.cancel()
    },
  }
}

export function createTtsEngine(options: TtsEngineOptions): TtsEngine {
  return new TtsEngine(options)
}
