/** `{name}` 플레이스홀더를 vars로 치환합니다. 없는 키는 그대로 둡니다. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    return key in vars ? (vars[key] ?? match) : match
  })
}
