import type { Game } from '../types'
import { formatScore, gradeColor, gradeLabel } from '../lib/utils'
import { Button, Cover, GradeBadge, IconEdit, IconTrash, Modal } from './ui'

export function GameDetailModal({
  game,
  onClose,
  onEdit,
  onDelete,
}: {
  game: Game | null
  onClose: () => void
  onEdit: (g: Game) => void
  onDelete: (g: Game) => void
}) {
  if (!game) return null

  return (
    <Modal open={Boolean(game)} onClose={onClose} width="max-w-[780px]">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 sm:grid-cols-[210px_1fr]">
          <div>
            <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10">
              <Cover file={game.cover} name={game.name} rounded="rounded-none" className="h-full w-full" />
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-[23px] font-semibold leading-tight tracking-tight">{game.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              {game.platform ? (
                <span className="rounded-md border border-white/12 bg-white/[0.04] px-2 py-1 text-white/75">
                  {game.platform}
                </span>
              ) : null}
              {game.genre ? (
                <span className="rounded-md border border-white/12 bg-white/[0.04] px-2 py-1 text-white/75">
                  {game.genre}
                </span>
              ) : null}
              <span
                className={`rounded-md border px-2 py-1 ${
                  game.completed
                    ? 'border-[#3f6b4f]/60 bg-[#12251a] text-[#8fd7a6]'
                    : 'border-white/12 bg-white/[0.04] text-white/55'
                }`}
              >
                {game.completed ? '已通关' : '未通关'}
              </span>
              {!game.platform && !game.genre ? (
                <span className="text-white/30">未设置平台 / 类型</span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="text-[11px] tracking-wide text-muted">个人评分</div>
                <div className="mt-1 flex items-baseline gap-1">
                  {game.score == null ? (
                    <span className="text-[22px] text-white/35">未评分</span>
                  ) : (
                    <>
                      <span className="text-[26px] font-semibold leading-none tabular-nums text-gold">
                        {formatScore(game.score)}
                      </span>
                      <span className="text-[11px] text-muted">/ 10</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="text-[11px] tracking-wide text-muted">个人等级</div>
                <div className="mt-1 flex items-center gap-2">
                  {game.grade ? (
                    <>
                      <span
                        className="text-[24px] font-semibold leading-none"
                        style={{ color: gradeColor(game.grade) }}
                      >
                        {game.grade}
                      </span>
                      <span className="text-[12px] text-white/60">{gradeLabel(game.grade)}</span>
                    </>
                  ) : (
                    <GradeBadge grade="" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[11px] tracking-wide text-muted">个人感想</div>
              {game.thoughts.trim() ? (
                <p className="mt-2 max-h-[220px] overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/85">
                  {game.thoughts}
                </p>
              ) : (
                <p className="mt-2 text-[13px] text-white/30">还没有写感想。</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.07] px-6 py-3.5">
        <Button variant="text" size="sm" onClick={() => onDelete(game)} className="text-[#c98b86] hover:text-[#eda9a2]">
          <IconTrash className="h-4 w-4" />
          删除游戏
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button variant="primary" onClick={() => onEdit(game)}>
            <IconEdit className="h-4 w-4" />
            编辑
          </Button>
        </div>
      </div>
    </Modal>
  )
}
