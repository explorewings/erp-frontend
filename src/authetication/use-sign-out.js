import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context.js'

export function useSignOut() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return () => {
    logout()
    navigate('/login', { replace: true })
  }
}
