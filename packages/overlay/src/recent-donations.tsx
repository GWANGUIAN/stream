import type { Platform } from '@stream/core'

export interface RecentDonation {
  id: string
  platform: Platform
  nickname: string
  amount: number
  currency: string
  at: number
}

export function RecentDonations({
  items,
  max = 5,
  className,
}: {
  items: RecentDonation[]
  max?: number
  className?: string
}) {
  const visible = items.slice(0, max)
  return (
    <div className={['stream-recent-donations', className].filter(Boolean).join(' ')}>
      {visible.map((item) => (
        <div key={item.id} className="stream-recent-donation">
          <strong>{item.nickname}</strong>
          <span>
            {item.amount} {item.currency}
          </span>
        </div>
      ))}
    </div>
  )
}
