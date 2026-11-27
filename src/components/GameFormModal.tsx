import { useCallback, useEffect, useRef, useState } from 'react'
import { GENRES, GRADES, PLATFORMS, SCORE_OPTIONS } from '../constants'
import type { Game, GameDraft } from '../types'
import { CoverPickerModal } from './CoverPickerModal'
import {
  Button,
  Cover,
  IconClose,
  IconSearch,
  IconUpload,
  Label,
  Modal,
  Segmented,
  Select,
} from './ui'

const EMPTY: GameDraft = {
  name: '',
  cover: null,
  platform: '',
  genre: '',
  score: null,
  grade: '',
  completed: false,
  thoughts: '',
}

function toDraft(g: Game): GameDraft {
  return {
    name: g.name,
    cover: g.cover,
    platform: g.platform,
    genre: g.genre,
    score: g.score,
    grade: g.grade,
    completed: g.completed,
    thoughts: g.thoughts,
  }
}

export function GameFormModal({
  open,
  game,
  onClose,
  onSave,
  notify,
}: {
  open: boolean
  game: Game | null
  onClose: () => void
  onSave: (draft: GameDraft) => Promise<void>
  notify: (msg: string, kind?: 'ok' | 'err') => void
}) {
  const [draft, setDraft] = useState<GameDraft>(EMPTY)
  const [initialCover, setInitialCover] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const draftRef = useRef(draft)
  const initialRef = useRef<string | null>(null)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  useEffect(() => {
    initialRef.current = initialCover
  }, [initialCover])

  useEffect(() => {
    if (!open) return
    setDraft(game ? toDraft(game) : EMPTY)
    setInitialCover(game?.cover ?? null)
    setNameError(null)
    setSaving(false)
    setPickerOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, game?.id])

  const applyCover = useCallback((file: string | null) => {
    const prev = draftRef.current.cover
    if (prev && prev !== initialRef.current && prev !== file) {
      window.api?.deleteCover(prev)
    }
    setDraft((d) => ({ ...d, cover: file }))
  }, [])

  // 在百度网页里右键挑封面后，主进程会把本地文件回传到这里
  useEffect(() => {
    if (!open || !window.api) return
    return window.api.onCoverPicked(({ file }) => {
      applyCover(file)
      setPickerOpen(false)
      notify('封面已保存到本地')
    })
  }, [open, applyCover, notify])

  const cancel = () => {
    const cur = draftRef.current.cover
    if (cur && cur !== initialRef.current) window.api?.deleteCover(cur)
    onClose()
  }

  const save = async () => {
    if (!draft.name.trim()) {
      setNameError('请填写游戏名称')
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await onSave({ ...draft, name: draft.name.trim() })
    } catch (e) {
      notify('保存失败：' + String((e as Error)?.message || e), 'err')
      setSaving(false)
    }
  }

  const uploadCover = async () => {
    const r = await window.api?.uploadCover()
    if (r?.file) {
      applyCover(r.file)
      notify('本地图片已设为封面')
    } else if (r?.error) {
      notify(r.error, 'err')
    }
  }

  return (
    <>
      <Modal open={open} onClose={cancel} width="max-w-[900px]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold">{game ? '编辑游戏' : '添加游戏'}</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {game ? '修改后自动保存到本地数据库' : '只有游戏名称是必填的，其余可以之后再补'}
            </p>
          </div>
          <button
            onClick={cancel}
            aria-label="关闭"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/[0.07] hover:text-ink"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5 sm:grid-cols-[208px_1fr]">
          <div>
            <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-line bg-panel">
              <Cover file={draft.cover} name={draft.name} rounded="rounded-none" className="h-full w-full" />
            </div>
            <div className="mt-3 grid gap-2">
              <Button variant="soft" onClick={() => setPickerOpen(true)}>
                <IconSearch className="h-4 w-4" />
                百度搜索封面
              </Button>
              <Button variant="ghost" onClick={uploadCover}>
                <IconUpload className="h-4 w-4" />
                上传本地图片
              </Button>
              {draft.cover ? (
                <Button variant="text" size="sm" onClick={() => applyCover(null)}>
                  移除封面
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              封面会下载并保存在本地，原图链接以后失效也不影响。
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label>
                游戏名称 <span className="text-gold">*</span>
              </Label>
              <input
                autoFocus
                data-testid="game-name-input"
                value={draft.name}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, name: e.target.value }))
                  if (nameError) setNameError(null)
                }}
                placeholder="例如：黑神话：悟空 / Hollow Knight"
                spellCheck={false}
                className={`h-10 w-full rounded-xl border bg-panel px-3 text-[13.5px] text-ink outline-none placeholder:text-white/25 ${
                  nameError ? 'border-[#7a3b3b]' : 'border-line focus:border-gold/50'
                }`}
              />
              {nameError ? <p className="mt-1 text-[11.5px] text-[#e59a94]">{nameError}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>游戏平台</Label>
                <Select
                  ariaLabel="游戏平台"
                  value={draft.platform}
                  onChange={(v) => setDraft((d) => ({ ...d, platform: v }))}
                  options={[{ value: '', label: '未选择' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]}
                />
              </div>
              <div>
                <Label>游戏类型</Label>
                <Select
                  ariaLabel="游戏类型"
                  value={draft.genre}
                  onChange={(v) => setDraft((d) => ({ ...d, genre: v }))}
                  options={[{ value: '', label: '未选择' }, ...GENRES.map((p) => ({ value: p, label: p }))]}
                />
              </div>
            </div>

            <div>
              <Label>个人评分（0～10，0.5 递增）</Label>
              <div className="flex items-center gap-3">
                <Select
                  ariaLabel="个人评分"
                  value={draft.score == null ? '' : String(draft.score)}
                  onChange={(v) => setDraft((d) => ({ ...d, score: v === '' ? null : Number(v) }))}
                  options={[
                    { value: '', label: '未评分' },
                    ...SCORE_OPTIONS.map((s) => ({ value: String(s), label: s.toFixed(1) })),
                  ]}
                  className="w-[132px]"
                />
                <span className="text-[11.5px] text-muted">评分和等级互相独立，不会自动换算</span>
              </div>
            </div>

            <div>
              <Label>个人等级</Label>
              <div className="flex flex-wrap gap-1.5">
                {GRADES.map((g) => {
                  const active = draft.grade === g.key
                  return (
                    <button
                      key={g.key}
                      type="button"
                      data-testid={`grade-${g.key}`}
                      onClick={() => setDraft((d) => ({ ...d, grade: active ? '' : g.key }))}
                      className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors ${
                        active ? 'font-semibold' : 'border-line text-muted hover:text-ink'
                      }`}
                      style={
                        active
                          ? { borderColor: `${g.color}88`, backgroundColor: `${g.color}26`, color: g.color }
                          : undefined
                      }
                    >
                      <span className="text-[13px] font-bold">{g.key}</span>
                      <span className={active ? '' : 'opacity-70'}>{g.label}</span>
                    </button>
                  )
                })}
                {draft.grade ? (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, grade: '' }))}
                    className="h-9 rounded-lg border border-line px-2.5 text-[12px] text-muted hover:text-ink"
                  >
                    未评级
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <Label>是否通关</Label>
              <Segmented
                value={draft.completed ? 'completed' : 'uncompleted'}
                onChange={(v) => setDraft((d) => ({ ...d, completed: v === 'completed' }))}
                options={[
                  { value: 'completed', label: '已通关' },
                  { value: 'uncompleted', label: '未通关' },
                ]}
              />
            </div>

            <div>
              <Label>个人感想</Label>
              <textarea
                value={draft.thoughts}
                onChange={(e) => setDraft((d) => ({ ...d, thoughts: e.target.value }))}
                rows={6}
                placeholder="喜欢的地方、遗憾、想吐槽的，都可以写在这里…"
                className="w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-white/25 focus:border-gold/50"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-6 py-3.5">
          <span className="text-[11.5px] text-muted">{game ? '等级改变后会自动进入新的分组' : ' '}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={cancel}>
              取消
            </Button>
            <Button variant="primary" onClick={save} disabled={saving} data-testid="save-game">
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      <CoverPickerModal
        open={pickerOpen && open}
        gameName={draft.name || game?.name || ''}
        currentCover={draft.cover}
        onClose={() => setPickerOpen(false)}
        onPick={(file) => {
          applyCover(file)
          setPickerOpen(false)
          notify('封面已保存到本地')
        }}
        notify={notify}
      />
    </>
  )
}
