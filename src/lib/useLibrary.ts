import { useCallback, useEffect, useState } from 'react'
import type { Game, GameDraft } from '../types'
import { loadGames, putGames, removeGameRecord, replaceAllGames } from './db'
import { coverUrl, nextRank, normalizeRanks, uid } from './utils'

export interface ImportOutcome {
  added: number
  skipped: number
  total: number
}

export function useLibrary() {
  const [games, setGames] = useState<Game[]>([])
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadGames()
      .then((list) => {
        if (!alive) return
        const healed = normalizeRanks(list)
        setGames(healed)
        setReady(true)
        if (list.some((g, i) => g.rank !== healed[i]?.rank)) {
          putGames(healed).catch(() => {})
        }
      })
      .catch((e) => {
        if (!alive) return
        setStorageError(String(e?.message || e))
        setReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const commit = useCallback(async (next: Game[]) => {
    setGames(next)
    try {
      await putGames(next)
      setStorageError(null)
    } catch (e) {
      setStorageError('保存失败：' + String((e as Error)?.message || e))
    }
  }, [])

  const addGame = useCallback(
    async (draft: GameDraft) => {
      const now = Date.now()
      const game: Game = {
        id: uid(),
        name: draft.name.trim(),
        cover: draft.cover,
        platform: draft.platform,
        genre: draft.genre,
        score: draft.score,
        grade: draft.grade,
        completed: draft.completed,
        thoughts: draft.thoughts,
        createdAt: now,
        updatedAt: now,
        rank: draft.grade ? nextRank(games, draft.grade) : 0,
      }
      await commit(normalizeRanks([...games, game]))
      return game
    },
    [games, commit],
  )

  const updateGame = useCallback(
    async (id: string, patch: Partial<GameDraft>) => {
      const prev = games.find((g) => g.id === id)
      if (!prev) return
      const gradeChanged = 'grade' in patch && patch.grade !== prev.grade
      const rank = gradeChanged ? (patch.grade ? nextRank(games, patch.grade) : 0) : prev.rank
      const updated: Game = {
        ...prev,
        ...patch,
        name: (patch.name ?? prev.name).trim() || prev.name,
        rank,
        updatedAt: Date.now(),
      }
      await commit(normalizeRanks(games.map((g) => (g.id === id ? updated : g))))
      return updated
    },
    [games, commit],
  )

  const removeGame = useCallback(
    async (id: string) => {
      const game = games.find((g) => g.id === id)
      const next = normalizeRanks(games.filter((g) => g.id !== id))
      setGames(next)
      try {
        await removeGameRecord(id)
        await putGames(next)
      } catch (e) {
        setStorageError('删除失败：' + String((e as Error)?.message || e))
      }
      if (game?.cover) window.api?.deleteCover(game.cover)
    },
    [games],
  )

  const setGradeOrder = useCallback(
    async (grade: string, orderedIds: string[]) => {
      const map = new Map(orderedIds.map((id, i) => [id, i]))
      const next = games.map((g) =>
        g.grade === grade && map.has(g.id) ? { ...g, rank: map.get(g.id)! } : g,
      )
      await commit(next)
    },
    [games, commit],
  )

  const importGames = useCallback(
    async (items: Game[], mode: 'merge' | 'overwrite'): Promise<ImportOutcome> => {
      let added = 0
      let skipped = 0

      if (mode === 'overwrite') {
        const list = normalizeRanks(items)
        await replaceAllGames(list)
        setGames(list)
        added = list.length
        return { added, skipped: 0, total: list.length }
      }

      const existingNames = new Set(games.map((g) => g.name.trim().toLowerCase()))
      const existingIds = new Set(games.map((g) => g.id))
      const incoming: Game[] = []
      for (const item of items) {
        const key = item.name.trim().toLowerCase()
        if (existingIds.has(item.id) || existingNames.has(key)) {
          skipped += 1
          continue
        }
        existingNames.add(key)
        existingIds.add(item.id)
        incoming.push(item)
        added += 1
      }
      const merged = normalizeRanks([...games, ...incoming])
      await commit(merged)
      return { added, skipped, total: items.length }
    },
    [games, commit],
  )

  return {
    games,
    ready,
    storageError,
    addGame,
    updateGame,
    removeGame,
    setGradeOrder,
    importGames,
  }
}
