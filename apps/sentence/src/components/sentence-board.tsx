'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export interface SentenceBoardProps {
  sentence: string | null
}

export function SentenceBoard({ sentence }: SentenceBoardProps) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!sentence) return
    void navigator.clipboard.writeText(sentence)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="sentence-board">
      <span className="sentence-board-label">완성된 문장</span>
      {sentence ? (
        <>
          <p key={sentence} className="sentence-board-text">
            {sentence}
          </p>
          <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨' : '문장 복사'}
          </button>
        </>
      ) : (
        <p className="sentence-board-empty">섹션을 뽑으면 여기에 문장이 모입니다.</p>
      )}
    </div>
  )
}
