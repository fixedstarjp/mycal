import { useState } from 'react'
import { signIn } from '../useAuth'

// Supabaseモード時のログイン画面。個人利用のためサインアップ導線はなし
// (ユーザーはSupabaseダッシュボードで作成する: docs/SETUP_SUPABASE.md)
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const err = await signIn(email, password)
    if (err) setError(err)
    setBusy(false)
  }

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col items-center justify-center bg-slate-900 px-6 text-slate-200">
      <h1 className="mb-1 text-2xl font-bold text-slate-100">MyCal</h1>
      <p className="mb-6 text-sm text-slate-500">自分専用ライフログカレンダー</p>

      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200"
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-bold text-white active:bg-sky-500 disabled:opacity-50"
        >
          {busy ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}
