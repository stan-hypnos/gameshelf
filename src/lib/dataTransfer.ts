import { formatDate, csvEscape } from './utils'
import type { Game } from '../types'

export interface BackupPayload {
  app: 'GameShelf'
  version: number
  exportedAt: string
  games: (Game & { coverData?: string | null })[]
}

export async function buildBackup(games: Game[]): Promise<string> {
  const files = games.map((g) => g.cover).filter((f): f is string => Boolean(f))
  let covers: Record<string, string> = {}
  if (files.length && window.api) {
    covers = await window.api.readCovers(files)
  }
  const payload: BackupPayload = {
    app: 'GameShelf',
    version: 1,
    exportedAt: new Date().toISOString(),
    games: games.map((g) => ({
      ...g,
      coverData: g.cover ? covers[g.cover] || null : null,
    })),
  }
  return JSON.stringify(payload, null, 2)
}

export function buildCsv(games: Game[]): string {
  const header = [
    '游戏名称',
    '游戏平台',
    '游戏类型',
    '个人评分',
    '个人等级',
    '是否通关',
    '个人感想',
    '添加时间',
  ]
  const rows = games.map((g) =>
    [
      g.name,
      g.platform || '',
      g.genre || '',
      g.score == null ? '未评分' : g.score.toFixed(1),
      g.grade || '未评级',
      g.completed ? '已通关' : '未通关',
      g.thoughts || '',
      formatDate(g.createdAt),
    ]
      .map((v) => csvEscape(String(v)))
      .join(','),
  )
  return '\uFEFF' + header.join(',') + '\r\n' + rows.join('\r\n') + '\r\n'
}

function coerceGame(raw: unknown, index: number): Game | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) return null
  const gradeRaw = String(r.grade ?? '').toUpperCase()
  const grade = ['S', 'A', 'B', 'C', 'D'].includes(gradeRaw) ? (gradeRaw as Game['grade']) : ''
  const scoreNum = typeof r.score === 'number' ? r.score : Number(r.score)
  const score =
    r.score == null || r.score === '' || !Number.isFinite(scoreNum)
      ? null
      : Math.min(10, Math.max(0, Math.round(scoreNum * 2) / 2))
  const createdAt = Number(r.createdAt) || Date.now()
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `imp_${createdAt}_${index}`,
    name,
    cover: null,
    platform: typeof r.platform === 'string' ? r.platform : '',
    genre: typeof r.genre === 'string' ? r.genre : '',
    score,
    grade,
    completed: Boolean(r.completed),
    thoughts: typeof r.thoughts === 'string' ? r.thoughts : '',
    createdAt,
    updatedAt: Number(r.updatedAt) || createdAt,
    rank: Number.isFinite(Number(r.rank)) ? Number(r.rank) : index,
  }
}

export function parseBackup(text: string): (Game & { coverData?: string | null })[] {
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败，请选择 GameShelf 导出的备份文件')
  }
  const rawList = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { games?: unknown }).games)
      ? (payload as { games: unknown[] }).games
      : null
  if (!rawList) throw new Error('备份文件里没有找到游戏数据')

  const out: (Game & { coverData?: string | null })[] = []
  rawList.forEach((raw, i) => {
    const game = coerceGame(raw, i)
    if (!game) return
    const coverData =
      raw && typeof raw === 'object' && typeof (raw as { coverData?: unknown }).coverData === 'string'
        ? ((raw as { coverData: string }).coverData)
        : null
    out.push({ ...game, coverData })
  })
  if (!out.length) throw new Error('备份文件里没有可导入的游戏')
  return out
}
