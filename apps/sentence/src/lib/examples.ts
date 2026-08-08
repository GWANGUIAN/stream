import type { SectionId, SectionState } from '@stream/sentence'

/** 안내용 실제 예시 텍스트. */
export const SECTION_EXAMPLES: Record<SectionId, string> = {
  who: '왁굳형이',
  where: '숲속에서',
  how: '몰래',
  what: '도토리를',
  why: '배고파서',
}

/** 활성 섹션 기준 `!누가 왁굳형이` 형태 예시 목록. */
export function exampleCommands(sections: SectionState[]): string[] {
  return sections
    .filter((section) => section.enabled)
    .map((section) => `${section.prefix} ${SECTION_EXAMPLES[section.id]}`)
}
