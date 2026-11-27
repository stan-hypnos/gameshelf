import { useCallback, useEffect, useMemo, useState } from 'react'
import { GameDetailModal } from './components/GameDetailModal'
import { GameFormModal } from './components/GameFormModal'
import { ConfirmDialog, Toast } from './components/ui'
import { useLibrary } from './lib/useLibrary'
import { DataPage } from './pages/DataPage'
import { LibraryPage } from './pages/LibraryPage'
import { RankingPage } from './pages/RankingPage'
import type { Game, GameDraft, PageKey } from './types'

const IS_MAC = typeof window !== 'undefined' && window.api?.platform === 'darwin'

const TABS: { key: PageKey; label: string }[] = [
  { key: 'library', label: '游戏库' },
  { key: 'ranking', label: '我的排行' },
  { key: 'data', label: '数据管理' },
]

export default function App() {
  const lib = useLibrary()
  const [page, setPage] = useState<PageKey>('library')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState<{ mode: 'new' } | { mode: 'edit'; game: Game } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)

  const notify = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const detailGame = useMemo(
    () => (detailId ? lib.games.find((g) => g.id === detailId) ?? null : null),
    [detailId, lib.games],
  )

  const handleSave = async (draft: GameDraft) => {
    if (form?.mode === 'edit') {
      const oldCover = form.game.cover
      await lib.updateGame(form.game.id, draft)
      if (oldCover && oldCover !== draft.cover) window.api?.deleteCover(oldCover)
      notify('修改已保存')
    } else {
      await lib.addGame(draft)
      notify('已添加到游戏库')
    }
    setForm(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await lib.removeGame(deleteTarget.id)
    setDeleteTarget(null)
    setDetailId(null)
    notify('已删除这款游戏')
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="app-drag sticky top-0 z-40 border-b border-white/[0.06] bg-[#08080a]/80 backdrop-blur-xl">
        <div className={`mx-auto flex h-[62px] w-full max-w-[1500px] items-center gap-4 pr-5 md:pr-9 ${IS_MAC ? 'pl-[88px] sm:pl-[96px]' : 'pl-5 sm:pl-6'}`}>
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="font-display text-[17px] leading-none tracking-[0.22em] text-ink">
              GAMESHELF
            </span>
            <span className="hidden text-[9px] tracking-[0.28em] text-white/25 lg:inline">
              PERSONAL GAME SHELF
            </span>
          </div>

          <nav className="app-no-drag ml-auto flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] p-1">
            {TABS.map((t) => {
              const active = page === t.key
              return (
                <button
                  key={t.key}
                  data-testid={`tab-${t.key}`}
                  onClick={() => setPage(t.key)}
                  className={`flex h-8 items-center rounded-full px-3.5 text-[12.5px] transition-colors ${
                    active
                      ? 'bg-white/[0.12] text-ink'
                      : 'text-white/45 hover:bg-white/[0.06] hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 pt-7 pb-10 md:px-9 md:pt-9">
        {lib.storageError ? (
          <div className="mb-4 rounded-xl border border-[#5a2a2a] bg-[#2a1618]/70 px-4 py-3 text-[12px] text-[#e8aaa4]">
            本地存储异常：{lib.storageError}（请确认应用有写入权限，并先导出一次 JSON 备份）
          </div>
        ) : null}

        {page === 'library' ? (
          <LibraryPage
            games={lib.games}
            ready={lib.ready}
            onAdd={() => setForm({ mode: 'new' })}
            onOpen={setDetailId}
          />
        ) : null}

        {page === 'ranking' ? (
          <RankingPage
            games={lib.games}
            onOpen={setDetailId}
            onReorder={lib.setGradeOrder}
            notify={notify}
          />
        ) : null}

        {page === 'data' ? (
          <DataPage games={lib.games} importGames={lib.importGames} notify={notify} />
        ) : null}
      </main>

      <GameDetailModal
        game={detailGame}
        onClose={() => setDetailId(null)}
        onEdit={(g) => {
          setDetailId(null)
          setForm({ mode: 'edit', game: g })
        }}
        onDelete={(g) => setDeleteTarget(g)}
      />

      <GameFormModal
        open={Boolean(form)}
        game={form?.mode === 'edit' ? form.game : null}
        onClose={() => setForm(null)}
        onSave={handleSave}
        notify={notify}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这款游戏？"
        message={`「${deleteTarget?.name ?? ''}」的记录和本地封面会一起删除，删除后无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  )
}
