import type { Game } from '../types'
import { formatScore } from '../lib/utils'
import { Cover, GradeBadge } from './ui'

export function GameCard({
  game,
  onOpen,
  className = '',
}: {
  game: Game
  onOpen: (id: string) => void
  className?: string
}) {
  return (
    <button
      type="button"
      data-testid="game-card"
      data-game-name={game.name}
      onClick={() => onOpen(game.id)}
      className={`group block w-full text-left outline-none ${className}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[11px] border border-white/[0.07] bg-panel transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-gold/35 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] group-focus-visible:border-gold/60">
        <Cover
          file={game.cover}
          name={game.name}
          rounded="rounded-none"
          className="h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/10" />

        {game.grade ? (
          <div className="absolute left-1.5 top-1.5">
            <GradeBadge grade={game.grade} />
          </div>
        ) : null}

        {game.completed ? (
          <div className="absolute right-1.5 top-1.5 rounded-md border border-[#3f6b4f]/60 bg-[#12251a]/90 px-1.5 py-[3px] text-[10px] font-medium tracking-wide text-[#8fd7a6]">
            通关
          </div>
        ) : null}

        <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between">
          <span className="rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] tabular-nums text-white/85 backdrop-blur-sm">
            {game.score == null ? '未评分' : formatScore(game.score)}
          </span>
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <div className="truncate text-[13.5px] font-medium leading-snug text-ink">{game.name}</div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-muted">
          <span className="truncate">
            {[game.platform, game.genre].filter(Boolean).join(' · ') || '未设置'}
          </span>
        </div>
      </div>
    </button>
  )
}
