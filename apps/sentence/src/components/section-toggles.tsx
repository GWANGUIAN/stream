'use client'

import type { SectionId, SectionState } from '@stream/sentence'
import type { SentenceStore } from '@/lib/store'

export interface SectionTogglesProps {
  store: SentenceStore
  sections: SectionState[]
  locked: boolean
}

export function SectionToggles({ store, sections, locked }: SectionTogglesProps) {
  const enabledCount = sections.filter((s) => s.enabled).length

  return (
    <fieldset className="section-toggle-row" aria-label="섹션 선택">
      <legend className="sr-only">섹션 선택</legend>
      {sections.map((section) => {
        const disableOff = section.enabled && enabledCount <= 1
        return (
          <button
            key={section.id}
            type="button"
            className={`section-chip ${section.enabled ? 'active' : ''}`}
            disabled={locked || disableOff}
            aria-pressed={section.enabled}
            onClick={() =>
              store.engine.setSectionEnabled(section.id as SectionId, !section.enabled)
            }
            title={
              disableOff
                ? '최소 1개 섹션은 켜 두어야 합니다'
                : `${section.label} (${section.prefix})`
            }
          >
            {section.label}
          </button>
        )
      })}
    </fieldset>
  )
}
