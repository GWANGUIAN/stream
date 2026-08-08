import { PlatformLoginButton, type PlatformLoginButtonProps } from './platform-login-button'

export type SoopLoginButtonProps = Omit<PlatformLoginButtonProps, 'platform'>

export function SoopLoginButton(props: SoopLoginButtonProps) {
  return <PlatformLoginButton platform="soop" {...props} />
}
