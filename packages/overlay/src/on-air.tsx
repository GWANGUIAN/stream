export function OnAirBadge({
  live,
  label = 'ON AIR',
  offlineLabel = 'OFFLINE',
  className,
}: {
  live: boolean
  label?: string
  offlineLabel?: string
  className?: string
}) {
  return (
    <div
      className={['stream-on-air', live ? 'is-live' : 'is-offline', className]
        .filter(Boolean)
        .join(' ')}
    >
      {live ? label : offlineLabel}
    </div>
  )
}
