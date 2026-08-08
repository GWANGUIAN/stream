'use client'

import type { RouletteSnapshot } from '@stream/roulette'
import { useRef, useState } from 'react'
import type { RouletteStore } from '@/lib/store'

export interface ItemManagerProps {
  store: RouletteStore
  snapshot: RouletteSnapshot
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ItemManager({ store, snapshot }: ItemManagerProps) {
  const [bulkText, setBulkText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleBulkAdd() {
    if (!bulkText.trim()) return
    store.engine.addItemsFromText(bulkText)
    setBulkText('')
  }

  function handleExportPreset() {
    downloadJson(`roulette-preset-${Date.now()}.json`, {
      title: snapshot.title,
      platform: snapshot.platform,
      streamerId: snapshot.streamerId,
      rule: snapshot.rule,
      weightMode: snapshot.weightMode,
      winnerAction: snapshot.winnerAction,
      items: snapshot.items,
    })
  }

  function handleImportPreset(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        store.engine.loadSnapshot(parsed)
      } catch {
        window.alert('프리셋 파일을 읽을 수 없습니다.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">아이템 관리</h2>
      <p className="glass-panel-sub">
        여러 줄 일괄 등록, 프리셋 저장/불러오기, 초기화를 할 수 있습니다.
      </p>

      <div className="field">
        <span className="field-label">여러 줄 붙여넣기 (예: 치킨 x3)</span>
        <textarea
          rows={3}
          value={bulkText}
          placeholder={'치킨 x3\n피자\n떡볶이 x2'}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={handleBulkAdd}
          style={{ marginTop: '0.4rem' }}
        >
          일괄 등록
        </button>
      </div>

      <hr className="section-divider" />

      <div className="field-row">
        <button type="button" className="btn btn-sm btn-secondary" onClick={handleExportPreset}>
          프리셋 내보내기
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          프리셋 불러오기
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportPreset(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="field-row" style={{ marginTop: '0.6rem' }}>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => window.confirm('아이템을 모두 지울까요?') && store.engine.clearItems()}
        >
          아이템 초기화
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() =>
            window.confirm('아이템/접수/결과를 전체 리셋할까요?') && store.engine.resetAll()
          }
        >
          전체 리셋
        </button>
      </div>
    </section>
  )
}
