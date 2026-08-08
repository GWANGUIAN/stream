import type { AlertItem, AlertQueue } from '@stream/alerts'
import { useEffect, useState } from 'react'

export function AlertHost({ queue, className }: { queue: AlertQueue; className?: string }) {
  const [alert, setAlert] = useState<AlertItem | null>(queue.currentAlert)

  useEffect(() => queue.onChange(setAlert), [queue])

  if (!alert) return null

  return (
    <div
      className={['stream-alert-host', className].filter(Boolean).join(' ')}
      data-kind={alert.kind}
    >
      <div className="stream-alert-card" key={alert.id}>
        <div className="stream-alert-title">{alert.title}</div>
        {alert.amount != null ? (
          <div className="stream-alert-amount">
            {alert.amount}
            {alert.currency ? ` ${alert.currency}` : ''}
          </div>
        ) : null}
        {alert.subtitle ? <div className="stream-alert-subtitle">{alert.subtitle}</div> : null}
      </div>
    </div>
  )
}
