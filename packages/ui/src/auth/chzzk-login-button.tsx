import { PlatformLoginButton, type PlatformLoginButtonProps } from './platform-login-button'

export type ChzzkLoginButtonProps = Omit<PlatformLoginButtonProps, 'platform'>

export function ChzzkLoginButton(props: ChzzkLoginButtonProps) {
  return <PlatformLoginButton platform="chzzk" {...props} />
}
