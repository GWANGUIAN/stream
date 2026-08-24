/** 받침 유무에 따라 목적격 조사 '을'/'를'을 고른다. 한글 음절이 아니면 '를'로 기본 처리한다. */
export function eulOrReul(word: string): "을" | "를" {
  const lastChar = word.trim().at(-1);
  if (!lastChar) return "를";
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "를";
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return hasBatchim ? "을" : "를";
}
