'use client'

import { colorForIndex, type RouletteItem } from '@stream/roulette'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@stream/ui'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { RouletteStore } from '@/lib/store'

export interface ItemListProps {
  store: RouletteStore
  items: RouletteItem[]
}

function formatItemsForCopy(items: RouletteItem[]): string {
  return items.map((item) => `${item.label}*${item.count}`).join(',')
}

function ItemRow({
  store,
  item,
  index,
}: {
  store: RouletteStore
  item: RouletteItem
  index: number
}) {
  const swatchColor = item.color ?? colorForIndex(index)
  const nicknames = item.contributors.slice(-4)
  const row = (
    <div className="item-row">
      <span className="swatch" style={{ background: swatchColor }} />
      <input
        type="text"
        defaultValue={item.label}
        onBlur={(e) => store.engine.renameItem(item.id, e.target.value)}
      />
      <div className="stepper">
        <button type="button" onClick={() => store.engine.setItemCount(item.id, item.count - 1)}>
          −
        </button>
        <span>{item.count}</span>
        <button type="button" onClick={() => store.engine.setItemCount(item.id, item.count + 1)}>
          +
        </button>
      </div>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        onClick={() => store.engine.removeItem(item.id)}
      >
        ✕
      </button>
    </div>
  )

  if (nicknames.length === 0) return row

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="left" className="item-contrib-tooltip">
        {nicknames.join(', ')}
      </TooltipContent>
    </Tooltip>
  )
}

export function ItemList({ store, items }: ItemListProps) {
  const [newLabel, setNewLabel] = useState('')
  const [newCount, setNewCount] = useState(1)
  const [copied, setCopied] = useState(false)

  function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    store.engine.addItem(label, Math.max(1, newCount))
    setNewLabel('')
    setNewCount(1)
  }

  function handleCopy() {
    if (items.length === 0) return
    void navigator.clipboard.writeText(formatItemsForCopy(items)).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <section className="glass-panel item-list-panel">
      <h2 className="glass-panel-title">아이템 목록</h2>
      <p className="glass-panel-sub">
        후원으로 자동 등록되거나, 여기서 바로 수정할 수 있습니다.
      </p>

      <div className="field-row">
        <input
          value={newLabel}
          placeholder="아이템 이름"
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="number"
          min={1}
          value={newCount}
          style={{ flex: '0 0 4.5rem' }}
          onChange={(e) => setNewCount(Math.max(1, Number(e.target.value) || 1))}
        />
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          추가
        </button>
      </div>

      <hr className="section-divider" />

      <TooltipProvider delayDuration={280}>
        <div className="item-table scroll-thin item-table-tall">
          {items.length === 0 ? (
            <div className="item-empty">등록된 아이템이 없습니다.</div>
          ) : (
            items.map((item, index) => (
              <ItemRow key={item.id} store={store} item={item} index={index} />
            ))
          )}
        </div>
      </TooltipProvider>

      <div className="item-list-actions">
        <button
          type="button"
          className="btn btn-sm btn-block"
          disabled={!store.engine.canUndo()}
          onClick={() => store.engine.undo()}
        >
          ↶ 실행 취소
        </button>
        <button
          type="button"
          className="btn btn-sm btn-block btn-secondary"
          disabled={items.length === 0}
          onClick={handleCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : '목록 복사'}
        </button>
        <p className="item-copy-hint">(예: 사과*1,키위*2)</p>
      </div>
    </section>
  )
}
