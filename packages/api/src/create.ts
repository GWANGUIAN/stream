import { anonymousCredential } from '@stream/auth'
import { ChzzkStreamApi } from './chzzk/client'
import { SoopStreamApi } from './soop/client'
import type { CreateStreamApiOptions, StreamApi } from './types'

export function createStreamApi(options: CreateStreamApiOptions): StreamApi {
  const credential = options.credential ?? anonymousCredential(options.platform)

  if (options.platform === 'chzzk') {
    return new ChzzkStreamApi({
      credential,
      fetch: options.fetch,
    })
  }

  return new SoopStreamApi({
    credential,
    fetch: options.fetch,
    domain: options.soopDomain,
  })
}
