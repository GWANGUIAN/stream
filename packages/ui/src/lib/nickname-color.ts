/**
 * 닉네임 문자열을 안정적인 해시로 색상에 매핑합니다.
 * 같은 닉네임은 항상 같은 색이 나오고, 시청자마다 구분되도록 골고루 흩어집니다.
 */
export function hashNickname(nickname: string): number {
  const key = nickname.trim().toLowerCase()
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function colorForNickname(nickname: string): string {
  const hue = hashNickname(nickname) % 360
  // 채도·명도를 고정해 다크/라이트 배경 모두에서 읽기 쉽게 유지합니다.
  return `hsl(${hue} 78% 58%)`
}
