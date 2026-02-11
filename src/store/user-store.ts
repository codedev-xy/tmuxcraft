import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const EN_ADJECTIVES = ['Swift', 'Turbo', 'Neon', 'Cyber', 'Pixel', 'Hyper', 'Quantum', 'Sonic', 'Ultra', 'Ninja']
const EN_NOUNS = ['Panda', 'Shell', 'Terminal', 'Otter', 'Phoenix', 'Falcon', 'Tiger', 'Byte', 'Coder', 'Fox']
const ZH_ADJECTIVES = ['闪电', '极速', '赛博', '量子', '超级', '忍者', '星际', '雷霆', '幻影', '疾风']
const ZH_NOUNS = ['面板', '终端', '水獭', '凤凰', '猎鹰', '编码者', '探索者', '旅人', '高手', '达人']

interface UserState {
  username: string
  language: 'zh' | 'en'
  soundEnabled: boolean
  isFirstVisit: boolean
  setUsername: (name: string) => void
  generateRandomUsername: () => string
  setLanguage: (lang: 'zh' | 'en') => void
  toggleSound: () => void
  completeFirstVisit: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      username: '',
      language: 'zh',
      soundEnabled: true,
      isFirstVisit: true,

      setUsername: (name: string) => set({ username: name }),

      generateRandomUsername: () => {
        const lang = get().language
        const adjectives = lang === 'zh' ? ZH_ADJECTIVES : EN_ADJECTIVES
        const nouns = lang === 'zh' ? ZH_NOUNS : EN_NOUNS
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
        const noun = nouns[Math.floor(Math.random() * nouns.length)]
        const name = `${adj}${noun}`
        set({ username: name })
        return name
      },

      setLanguage: (lang: 'zh' | 'en') => set({ language: lang }),

      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),

      completeFirstVisit: () => set({ isFirstVisit: false }),
    }),
    { name: 'tmuxcraft-user' }
  )
)
