import { useMemo, useState } from 'react'
import { GENRES, GRADES, PLATFORMS, SCORE_OPTIONS, SORT_OPTIONS } from '../constants'
import { filterGames, sortGames } from '../lib/utils'
import type { Filters, Game, GradeKey, SortKey } from '../types'
import { GameCard } from '../components/GameCard'
import {
  Button,
  IconClose,
  IconFilter,
  IconPlus,
  IconSearch,
  Label,
  Segmented,
  Select,
} from '../components/ui'

const EMPTY: Filters = {
  keyword: '',
  platform: '',
  genre: '',
  scoreMin: null,
  scoreMax: null,
  grades: [],
  completion: 'all',
}

export function LibraryPage({
  games,
  ready,
  onAdd,
  onOpen,
}: {
  games: Game[]
  ready: boolean
  onAdd: () => void
  onOpen: (id: string) => void
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [sort, setSort] = useState<SortKey>('recent')
  const [panelOpen, setPanelOpen] = useState(false)

  const filtered = useMemo(() => sortGames(filterGames(games, filters), sort), [games, filters, sort])

  const activeCount =
    (filters.platform ? 1 : 0) +
    (filters.genre ? 1 : 0) +
    (filters.scoreMin != null || filters.scoreMax != null ? 1 : 0) +
    (filters.grades.length ? 1 : 0) +
    (filters.completion !== 'all' ? 1 : 0)

  const completedCount = games.filter((g) => g.completed).length

  const toggleGrade = (k: GradeKey) => {
    setFilters((f) => ({
      ...f,
      grades: f.grades.includes(k) ? f.grades.filter((x) => x !== k) : [...f.grades, k],
    }))
  }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[27px] font-semibold leading-none tracking-tight">游戏库</h1>
          <p className="mt-2 text-[12.5px] text-muted">
            {ready ? (
              <>
                共 {games.length} 款 · 已通关 {completedCount} 款
                {games.length ? ` · 封面 ${games.filter((g) => g.cover).length} 张` : ''}
              </>
            ) : (
              '正在读取本地数据…'
            )}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={onAdd} data-testid="add-game">
          <IconPlus className="h-4 w-4" />
          添加游戏
        </Button>
      </div>

      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            placeholder="搜索游戏名称…"
            spellCheck={false}
            className="h-10 w-full rounded-xl border border-line bg-panel-2 pl-10 pr-9 text-[13px] text-ink outline-none transition-colors placeholder:text-white/25 hover:border-white/20 focus:border-gold/50"
          />
          {filters.keyword ? (
            <button
              onClick={() => setFilters((f) => ({ ...f, keyword: '' }))}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-white/10 hover:text-ink"
              aria-label="清空搜索"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeCount ? 'soft' : 'ghost'}
            onClick={() => setPanelOpen((v) => !v)}
            className={activeCount ? 'border border-gold/30' : ''}
          >
            <IconFilter className="h-4 w-4" />
            筛选
            {activeCount ? (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold/20 px-1 text-[10.5px] font-semibold text-gold">
                {activeCount}
              </span>
            ) : null}
          </Button>
          <Select
            ariaLabel="排序"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
            className="w-[154px]"
          />
        </div>
      </div>

      {panelOpen ? (
        <div className="mt-3 rounded-2xl border border-line bg-panel/70 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>平台</Label>
              <Select
                ariaLabel="按平台筛选"
                value={filters.platform}
                onChange={(v) => setFilters((f) => ({ ...f, platform: v }))}
                options={[{ value: '', label: '全部平台' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]}
              />
            </div>
            <div>
              <Label>类型</Label>
              <Select
                ariaLabel="按类型筛选"
                value={filters.genre}
                onChange={(v) => setFilters((f) => ({ ...f, genre: v }))}
                options={[{ value: '', label: '全部类型' }, ...GENRES.map((p) => ({ value: p, label: p }))]}
              />
            </div>
            <div>
              <Label>评分区间</Label>
              <div className="flex items-center gap-1.5">
                <Select
                  ariaLabel="最低评分"
                  value={filters.scoreMin == null ? '' : String(filters.scoreMin)}
                  onChange={(v) =>
                    setFilters((f) => ({ ...f, scoreMin: v === '' ? null : Number(v) }))
                  }
                  options={[
                    { value: '', label: '最低' },
                    ...SCORE_OPTIONS.map((s) => ({ value: String(s), label: s.toFixed(1) })),
                  ]}
                  className="flex-1"
                />
                <span className="text-[12px] text-muted">~</span>
                <Select
                  ariaLabel="最高评分"
                  value={filters.scoreMax == null ? '' : String(filters.scoreMax)}
                  onChange={(v) =>
                    setFilters((f) => ({ ...f, scoreMax: v === '' ? null : Number(v) }))
                  }
                  options={[
                    { value: '', label: '最高' },
                    ...SCORE_OPTIONS.map((s) => ({ value: String(s), label: s.toFixed(1) })),
                  ]}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>等级</Label>
              <div className="flex flex-wrap gap-1.5">
                {GRADES.map((g) => {
                  const active = filters.grades.includes(g.key)
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => toggleGrade(g.key)}
                      className={`h-8 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors ${
                        active ? 'border-transparent text-[#141414]' : 'border-line text-muted hover:text-ink'
                      }`}
                      style={active ? { backgroundColor: g.color } : undefined}
                      title={g.label}
                    >
                      {g.key}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label>通关状态</Label>
              <Segmented
                value={filters.completion}
                onChange={(v) => setFilters((f) => ({ ...f, completion: v }))}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'completed', label: '已通关' },
                  { value: 'uncompleted', label: '未通关' },
                ]}
                className="w-full justify-between"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[12px] text-muted">
              {filtered.length === games.length
                ? `共 ${games.length} 款`
                : `筛选出 ${filtered.length} / ${games.length} 款`}
            </span>
            <Button
              variant="text"
              size="sm"
              onClick={() => setFilters({ ...EMPTY, keyword: filters.keyword })}
            >
              清除筛选条件
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {!ready ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] w-full rounded-[11px] bg-white/[0.04]" />
                <div className="mt-2 h-3 w-2/3 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <EmptyLibrary onAdd={onAdd} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <p className="text-[14px] text-ink">没有符合条件的游戏</p>
            <p className="mt-1 text-[12.5px] text-muted">试试换个关键词，或清除筛选条件</p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setFilters(EMPTY)}>
              清除筛选
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((g) => (
              <GameCard key={g.id} game={g} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyLibrary({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-7 w-7 text-white/25">
          <rect x="5.5" y="3" width="13" height="18" rx="2.4" />
          <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
        </svg>
      </div>
      <p className="mt-4 text-[15px] text-ink">游戏库还是空的</p>
      <p className="mt-1 text-[12.5px] text-muted">记录第一款玩过的游戏，给封面、打个分</p>
      <Button variant="primary" className="mt-5" onClick={onAdd}>
        <IconPlus className="h-4 w-4" />
        添加游戏
      </Button>
    </div>
  )
}
