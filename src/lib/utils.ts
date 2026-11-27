import { GRADE_ORDER, GRADES } from '../constants'
import type { Filters, Game, SortKey } from '../types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function formatScore(score: number | null): string {
  return score == null ? '未评分' : score.toFixed(1)
}

export function gradeIndex(grade: string): number {
  const v = GRADE_ORDER[grade]
  return v == null ? 9 : v
}

export function gradeLabel(grade: string): string {
  return GRADES.find((g) => g.key === grade)?.label ?? ''
}

export function gradeColor(grade: string): string {
  return GRADES.find((g) => g.key === grade)?.color ?? '#8d8c96'
}

export function compareName(a: string, b: string): number {
  return a.localeCompare(b, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
}

export function sortGames(games: Game[], sort: SortKey): Game[] {
  const list = [...games]
  switch (sort) {
    case 'name':
      list.sort((a, b) => compareName(a.name, b.name))
      break
    case 'scoreDesc':
      list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || compareName(a.name, b.name))
      break
    case 'scoreAsc':
      list.sort((a, b) => (a.score ?? 99) - (b.score ?? 99) || compareName(a.name, b.name))
      break
    case 'grade':
      list.sort(
        (a, b) =>
          gradeIndex(a.grade) - gradeIndex(b.grade) ||
          (b.score ?? -1) - (a.score ?? -1) ||
          compareName(a.name, b.name),
      )
      break
    case 'custom':
      list.sort(
        (a, b) =>
          gradeIndex(a.grade) - gradeIndex(b.grade) ||
          a.rank - b.rank ||
          compareName(a.name, b.name),
      )
      break
    case 'recent':
    default:
      list.sort((a, b) => b.createdAt - a.createdAt)
      break
  }
  return list
}

export function filterGames(games: Game[], f: Filters): Game[] {
  const kw = f.keyword.trim().toLowerCase()
  return games.filter((g) => {
    if (kw && !g.name.toLowerCase().includes(kw)) return false
    if (f.platform && g.platform !== f.platform) return false
    if (f.genre && g.genre !== f.genre) return false
    if (f.scoreMin != null || f.scoreMax != null) {
      if (g.score == null) return false
      if (f.scoreMin != null && g.score < f.scoreMin) return false
      if (f.scoreMax != null && g.score > f.scoreMax) return false
    }
    if (f.grades.length && !f.grades.includes(g.grade as never)) return false
    if (f.completion === 'completed' && !g.completed) return false
    if (f.completion === 'uncompleted' && g.completed) return false
    return true
  })
}

/** 组内排名重新编号为 0..n-1 */
export function normalizeRanks(games: Game[]): Game[] {
  const byGrade = new Map<string, Game[]>()
  for (const g of games) {
    if (!g.grade) continue
    const arr = byGrade.get(g.grade) || []
    arr.push(g)
    byGrade.set(g.grade, arr)
  }
  const ranks = new Map<string, number>()
  byGrade.forEach((arr) => {
    arr
      .sort((a, b) => a.rank - b.rank || a.createdAt - b.createdAt)
      .forEach((g, i) => ranks.set(g.id, i))
  })
  return games.map((g) => (ranks.has(g.id) ? { ...g, rank: ranks.get(g.id)! } : g))
}

export function nextRank(games: Game[], grade: string): number {
  const inGrade = games.filter((g) => g.grade === grade)
  return inGrade.reduce((max, g) => Math.max(max, g.rank + 1), 0)
}

export function coverUrl(file: string | null): string | null {
  if (!file) return null
  return `app://gameshelf/covers/${encodeURIComponent(file)}`
}

export function csvEscape(v: string): string {
  if (/[",\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"'
  return v
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
