export type GradeKey = 'S' | 'A' | 'B' | 'C' | 'D'
export type Grade = GradeKey | ''

export interface Game {
  id: string
  name: string
  /** 本地封面文件名（保存在 userData/covers 下），null 表示无封面 */
  cover: string | null
  platform: string
  genre: string
  /** 0 ~ 10，0.5 递增，null 表示未评分 */
  score: number | null
  grade: Grade
  completed: boolean
  thoughts: string
  createdAt: number
  updatedAt: number
  /** 同等级内的手动排名序号 */
  rank: number
}

export interface GameDraft {
  name: string
  cover: string | null
  platform: string
  genre: string
  score: number | null
  grade: Grade
  completed: boolean
  thoughts: string
}

export type PageKey = 'library' | 'ranking' | 'data'

export type SortKey = 'recent' | 'name' | 'scoreDesc' | 'scoreAsc' | 'grade' | 'custom'

export interface Filters {
  keyword: string
  platform: string
  genre: string
  scoreMin: number | null
  scoreMax: number | null
  grades: GradeKey[]
  completion: 'all' | 'completed' | 'uncompleted'
}

export interface CoverResult {
  thumb: string
  full: string
  title: string
  width: number
  height: number
}

export interface ApiShape {
  searchCovers: (keyword: string, page: number) => Promise<{ items: CoverResult[]; total: number; error: string | null }>
  proxyImage: (url: string) => Promise<{ dataUrl: string | null }>
  saveCoverFromUrl: (url: string) => Promise<{ file?: string; error?: string }>
  saveCoverDataUrl: (dataUrl: string) => Promise<{ file?: string; error?: string }>
  uploadCover: () => Promise<{ file?: string; canceled?: boolean; error?: string }>
  deleteCover: (file: string) => Promise<{ ok: boolean }>
  readCovers: (files: string[]) => Promise<Record<string, string>>
  openBaiduPage: (keyword: string) => Promise<{ ok: boolean }>
  onCoverPicked: (cb: (data: { file: string }) => void) => () => void
  exportFile: (payload: {
    defaultName: string
    content: string
    encoding?: 'utf8' | 'base64'
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<{ path?: string; canceled?: boolean; error?: string }>
  importJson: () => Promise<{ path?: string; text?: string; canceled?: boolean; error?: string }>
  appInfo: () => Promise<{
    userData: string
    coversDir: string
    coverCount: number
    version: string
    platform: string
  }>
  openPath: (p: 'data' | 'covers') => Promise<string>
  platform?: 'darwin' | 'win32' | 'linux' | string
}

declare global {
  interface Window {
    api?: ApiShape
  }
}
