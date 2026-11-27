import { useEffect, useState } from 'react'
import type { CoverResult } from '../types'
import { Button, Cover, IconCheck, IconExternal, IconSearch, Modal } from './ui'

const thumbCache = new Map<string, string>()

function Thumb({ item }: { item: CoverResult }) {
  const [src, setSrc] = useState<string | null>(thumbCache.get(item.thumb) ?? null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    if (thumbCache.has(item.thumb)) {
      setSrc(thumbCache.get(item.thumb)!)
      return
    }
    setFailed(false)
    window.api?.proxyImage(item.thumb).then((r) => {
      if (!alive) return
      if (r?.dataUrl) {
        thumbCache.set(item.thumb, r.dataUrl)
        setSrc(r.dataUrl)
      } else {
        setFailed(true)
      }
    })
    return () => {
      alive = false
    }
  }, [item.thumb])

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#141419] text-[11px] text-white/30">
      图片加载失败
      </div>
    )
  }
  if (!src) {
    return <div className="h-full w-full animate-pulse bg-white/[0.05]" />
  }
  return (
    <img
      src={src}
      alt={item.title || '百度图片'}
      draggable={false}
      className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
    />
  )
}

export function CoverPickerModal({
  open,
  gameName,
  currentCover,
  onClose,
  onPick,
  notify,
}: {
  open: boolean
  gameName: string
  currentCover: string | null
  onClose: () => void
  onPick: (file: string) => void
  notify: (msg: string, kind?: 'ok' | 'err') => void
}) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<CoverResult[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; item: CoverResult } | null>(null)
  const [applying, setApplying] = useState<string | null>(null)

  async function runSearch(kw: string, targetPage: number, append: boolean) {
    if (!kw) {
      setError('请先输入游戏名称或搜索关键词')
      return
    }
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)
    if (!window.api) {
      setError('封面搜索需要在桌面端应用内使用')
      setLoading(false)
      setLoadingMore(false)
      return
    }
    const r = await window.api.searchCovers(kw, targetPage)
    setLoading(false)
    setLoadingMore(false)
    if (r.error) {
      setError(
        r.error === 'blocked'
          ? '百度暂时限制了自动请求，可以稍后重试，或点击「在百度图片网页中挑选」。'
          : `百度图片搜索失败：${r.error}`,
      )
      return
    }
    setResults((prev) => {
      if (!append) return r.items
      const seen = new Set(prev.map((p) => p.thumb))
      return [...prev, ...r.items.filter((i) => !seen.has(i.thumb))]
    })
    setPage(targetPage)
    setTotal(r.total)
  }

  useEffect(() => {
    if (!open) return
    const kw = gameName.trim()
    setKeyword(kw)
    setResults([])
    setPage(0)
    setError(null)
    setMenu(null)
    if (kw) runSearch(kw, 0, false)
    else setError('先填写游戏名称，再搜索封面')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gameName])

  const applyCover = async (item: CoverResult) => {
    setMenu(null)
    if (!window.api || applying) return
    setApplying(item.full || item.thumb)
    const r = await window.api.saveCoverFromUrl(item.full || item.thumb)
    setApplying(null)
    if (r.file) {
      onPick(r.file)
    } else {
      notify(r.error || '封面保存失败，换一张试试', 'err')
    }
  }

  return (
    <Modal open={open} onClose={onClose} width="max-w-[1020px]" z="z-[60]">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[15.5px] font-semibold">百度图片搜索封面</h2>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            搜索结果来自百度图片，右键点击图片可设为封面
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-3">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch(keyword.trim(), 0, false)
            }}
            placeholder="输入游戏名称搜索百度图片"
            spellCheck={false}
            className="h-9 w-full rounded-lg border border-line bg-panel px-9 text-[13px] text-ink outline-none placeholder:text-white/25 focus:border-gold/50"
          />
        </div>
        <Button variant="primary" size="md" onClick={() => runSearch(keyword.trim(), 0, false)}>
          搜索
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={() => {
            const kw = keyword.trim()
            if (!kw) {
              notify('先输入关键词', 'err')
              return
            }
            window.api?.openBaiduPage(kw)
            notify('已打开百度图片网页，右键图片即可设为封面')
          }}
          title="打开真实百度图片网页，右键任意图片设为封面"
        >
          <IconExternal className="h-4 w-4" />
          网页中挑选
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {currentCover ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11.5px] text-muted">
            当前封面
            <Cover file={currentCover} name={gameName} className="h-10 w-[66px]" />
            <span>右键下方任意图片可替换</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#5a3a3a]/60 bg-[#1b1416]/40 py-14 text-center">
            <p className="max-w-[520px] text-[12.5px] leading-relaxed text-[#e2b0ac]">{error}</p>
            {keyword.trim() ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => runSearch(keyword.trim(), 0, false)}
              >
                重试
              </Button>
            ) : null}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.05]" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-muted">没有搜到结果，换个关键词试试</div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-[11.5px] text-muted">
              <span>百度图片 · 约 {total || results.length} 张结果</span>
              <span>右键图片 → 设为当前游戏封面</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((item, i) => (
                <div
                  key={item.thumb + i}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    const x = Math.min(e.clientX, window.innerWidth - 240)
                    const y = Math.min(e.clientY, window.innerHeight - 120)
                    setMenu({ x, y, item })
                  }}
                  data-testid="cover-tile"
                  className="group relative aspect-[2/3] cursor-context-menu overflow-hidden rounded-lg border border-white/[0.08] bg-[#0e0e12] transition-colors hover:border-gold/50"
                  title={item.title || '百度图片'}
                >
                  <Thumb item={item} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="text-[10.5px] text-white/75">右键设为封面</span>
                  </div>
                  {applying === (item.full || item.thumb) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                      <span className="text-[11px] text-white/80">保存中…</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                disabled={loadingMore}
                onClick={() => runSearch(keyword.trim(), page + 1, true)}
              >
                {loadingMore ? '加载中…' : '加载更多'}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3 text-[11.5px] text-muted">
        <span>图片会下载到本地保存，之后原链接失效也不影响显示</span>
        <span className="hidden sm:inline">Tip：右键菜单里选择「设为当前游戏封面」</span>
      </div>

      {menu ? (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
          />
          <div
            className="fixed z-[71] w-[232px] overflow-hidden rounded-xl border border-white/12 bg-[#1c1c23] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
            style={{ left: menu.x, top: menu.y }}
          >
            <div className="truncate px-2.5 py-1.5 text-[10.5px] text-white/35">
              {menu.item.title || '百度图片'}
            </div>
            <button
              onClick={() => applyCover(menu.item)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-gold/15 hover:text-gold"
            >
              <IconCheck className="h-4 w-4" />
              设为当前游戏封面
            </button>
            <div className="px-2.5 pb-1.5 pt-1 text-[10.5px] text-white/30">
              {menu.item.width && menu.item.height
                ? `${menu.item.width} × ${menu.item.height}`
                : ' '}
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  )
}
