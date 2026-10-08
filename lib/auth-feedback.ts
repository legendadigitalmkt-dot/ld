type AuthFailure = { code?: string; status?: number }

export function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') || '').trim().toLowerCase(),
    password: String(formData.get('password') || ''),
  }
}

export function authErrorMessage(error: AuthFailure) {
  switch (error.code) {
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar. Abra o link enviado para sua caixa de entrada e verifique também o spam.'
    case 'invalid_credentials':
      return 'E-mail ou senha inválidos. Use a conta do seu workspace ou recupere sua senha.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
    case 'same_password':
      return 'Escolha uma senha diferente da atual.'
    case 'weak_password':
      return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.'
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return 'O link expirou ou foi aberto em outro navegador. Solicite um novo link e abra no mesmo navegador.'
    default:
      if (error.status === 429) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
      return 'Não foi possível concluir o acesso agora. Tente novamente em alguns minutos.'
  }
}

// Only known destinations are allowed after establishing an authenticated session.
export function authRedirectPath(next: string | null) {
  return next === '/onboarding' || next === '/reset-password' ? next : '/app'
}
