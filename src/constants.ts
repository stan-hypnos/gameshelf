import type { GradeKey, SortKey } from './types'

export const PLATFORMS = [
  'PC',
  'PS5',
  'PS4',
  'PS3',
  'PS2',
  'PS1',
  'Nintendo Switch',
  'Nintendo Switch 2',
  'Xbox Series X/S',
  'Xbox One',
  'Xbox 360',
  'iOS',
  'Android',
  '其他',
] as const

export const GENRES = [
  'RPG',
  'ARPG',
  'JRPG',
  '动作',
  '动作冒险',
  '开放世界',
  'FPS',
  'TPS',
  '策略',
  '模拟经营',
  '生存建造',
  'Roguelike',
  '竞速',
  '体育',
  '格斗',
  '解谜',
  '音乐节奏',
  '视觉小说',
  '冒险',
  '其他',
] as const

export const GRADES: { key: GradeKey; label: string; color: string }[] = [
  { key: 'S', label: '神作', color: '#e9c46a' },
  { key: 'A', label: '非常优秀', color: '#ef8354' },
  { key: 'B', label: '优秀', color: '#5bc8d6' },
  { key: 'C', label: '一般', color: '#9aa0ac' },
  { key: 'D', label: '不喜欢', color: '#c9736f' },
]

export const GRADE_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }

export const SCORE_OPTIONS: number[] = Array.from({ length: 21 }, (_, i) => i * 0.5)

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: '最近添加' },
  { key: 'name', label: '游戏名称' },
  { key: 'scoreDesc', label: '评分从高到低' },
  { key: 'scoreAsc', label: '评分从低到高' },
  { key: 'grade', label: '等级' },
  { key: 'custom', label: '自定义排名' },
]
