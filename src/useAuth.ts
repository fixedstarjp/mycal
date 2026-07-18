import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseMode, supabase } from './data/supabaseClient'

export interface AuthState {
  // ローカルモード時は常にready(認証不要)
  ready: boolean
  session: Session | null
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseMode)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isSupabaseMode) return { ready: true, session: null }
  return { ready: !loading, session }
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Supabase未設定です'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? error.message : null
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}
