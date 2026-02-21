import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  language: 'zh' | 'en'
  setLanguage: (lang: 'zh' | 'en') => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      language: 'zh',
      setLanguage: (lang: 'zh' | 'en') => set({ language: lang }),
    }),
    { name: 'tmuxcraft-user' }
  )
)
