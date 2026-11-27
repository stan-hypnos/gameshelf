import { useMemo, useState } from 'react'
import { GRADES } from '../constants'
import type { Game, GradeKey } from '../types'
import { GameCard } from '../components/GameCard'
import { IconGrip } from '../components/ui'

type Orders = Record<GradeKey, string[]>

function buildOrders(games: Game[]): Orders {
  const out: Orders = { S: [], A: [], B: [], C: [], D: [] }
  for (const g of games) {
    if (!g.grade) continue
    const key = g.grade as GradeKey
    if (out[key]) out[key].push(g.id)
  }
  const byId = new Map(games.map((g) => [g.id, g]))
  for (const k of Object.keys(out) as GradeKey[]) {
    out[k].sort((a, b) => {
      const ga = byId.get(a)!
      const gb = byId.get(b)!
      return ga.rank - gb.rank || ga.createdAt - gb.createdAt
    })
  }
  return out
}

export function RankingPage({
  games,
  onOpen,
  onReorder,
  notify,
}: {
  games: Game[]
  onOpen: (id: string) => void
  onReorder: (grade: string, ids: string[]) => Promise<void>
  notify: (msg: string, kind?: 'ok' | 'err') => void
}) {
  const [drag, setDrag] = useState<{ id: string; grade: GradeKey } | null>(null)
  const [preview, setPreview] = useState<Orders | null>(null)

  const base = useMemo(() => buildOrders(games), [games])
  const orders = preview ?? base
  const byId = useMemo(() => new Map(games.map((g) => [g.id, g])), [games])

  const dragStart = (e: React.DragEvent, id: string, grade: GradeKey) => {
    setDrag({ id, grade })
    setPreview({ ...base, [grade]: [...base[grade]] })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const dragOver = (e: React.DragEvent, targetId: string, grade: GradeKey) => {
    e.preventDefault()
    if (!drag || drag.grade !== grade || drag.id === targetId) return
    setPreview((prev) => {
      const cur = prev ?? base
      const arr = [...cur[grade]]
      const from = arr.indexOf(drag.id)
      const to = arr.indexOf(targetId)
      if (from < 0 || to < 0 || from === to) return cur
      arr.splice(from, 1)
      arr.splice(to, 0, drag.id)
      return { ...cur, [grade]: arr }
    })
  }

  const finishDrag = async () => {
    const d = drag
    const p = preview
    setDrag(null)
    setPreview(null)
    if (d && p) {
      const ids = p[d.grade]
      if (ids.join('|') !== base[d.grade].join('|')) {
        await onReorder(d.grade, ids)
        notify('排名顺序已保存')
      }
    }
  }

  const graded = games.filter((g) => g.grade).length
  const ungraded = games.length - graded

  return (
    <div className="pb-16">
      <div>
        <h1 className="text-[27px] font-semibold leading-none tracking-tight">我的排行</h1>
        <p className="mt-2 text-[12.5px] text-muted">
          按 S / A / B / C / D 分组 · 已评级 {graded} 款
          {ungraded > 0 ? ` · 还有 ${ungraded} 款未评级` : ''}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[11.5px] text-muted">
        <IconGrip className="h-4 w-4 text-white/35" />
        按住封面卡片拖动，即可调整同一等级里的先后顺序，松开自动保存
      </div>

      {GRADES.map((g) => {
        const list = orders[g.key].map((id) => byId.get(id)).filter((x): x is Game => Boolean(x))
        const dropHint = drag && drag.grade === g.key
        return (
          <section key={g.key} className="mt-9">
            <div className="flex items-center gap-3">
              <span
                className="font-display text-[30px] leading-none"
                style={{ color: g.color }}
              >
                {g.key}
              </span>
              <span className="text-[13px] text-white/70">{g.label}</span>
              <span className="text-[11.5px] text-white/30">{list.length} 款</span>
              <div
                className={`ml-2 h-px flex-1 transition-colors ${
                  dropHint ? 'bg-gold/40' : 'bg-white/[0.08]'
                }`}
              />
            </div>

            {list.length === 0 ? (
              <div className="mt-5 flex items-center gap-2 py-3 text-[12px] text-white/25">
                <span className="h-px w-4 bg-white/15" />
                这个等级还没有游戏，把游戏的等级设为 {g.key} 就会出现在这里
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-6">
                {list.map((game) => {
                  const isDragging = drag?.id === game.id
                  return (
                    <div
                      key={game.id}
                      data-testid="rank-card"
                      data-rank-id={game.id}
                      data-rank-grade={g.key}
                      draggable
                      onDragStart={(e) => dragStart(e, game.id, g.key)}
                      onDragOver={(e) => dragOver(e, game.id, g.key)}
                      onDrop={(e) => e.preventDefault()}
                      onDragEnd={finishDrag}
                      className={`drag-card relative w-[148px] cursor-grab transition-opacity sm:w-[168px] lg:w-[184px] ${
                        isDragging ? 'opacity-35' : ''
                      }`}
                    >
                      <GameCard game={game} onOpen={onOpen} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {games.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 py-16 text-center text-[13px] text-muted">
          还没有游戏，先去「游戏库」添加并设置等级
        </div>
      ) : null}
    </div>
  )
}
