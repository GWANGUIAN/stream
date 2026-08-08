'use client'

import { useEffect, useRef, useState } from 'react'

export interface TitleBarProps {
  title: string
  onChange: (title: string) => void
}

export function TitleBar({ title, onChange }: TitleBarProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setValue(title)
  }, [title, editing])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    setEditing(false)
    const next = value.trim()
    if (next) onChange(next)
    else setValue(title)
  }

  return (
    <div className="title-bar">
      {editing ? (
        <input
          ref={inputRef}
          className="title-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setValue(title)
              setEditing(false)
            }
          }}
          maxLength={40}
        />
      ) : (
        <button
          type="button"
          className="title-display"
          onClick={() => setEditing(true)}
          title="클릭해서 제목 수정"
        >
          {title}
        </button>
      )}
    </div>
  )
}
