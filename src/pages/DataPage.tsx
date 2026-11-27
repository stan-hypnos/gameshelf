import { useCallback, useEffect, useState } from 'react'
import { buildBackup, buildCsv, parseBackup } from '../lib/dataTransfer'
import type { ImportOutcome } from '../lib/useLibrary'
import type { Game } from '../types'
import {
  Button,
  ConfirmDialog,
  IconDatabase,
  IconDownload,
  IconExternal,
  IconUpload,
} from '../components/ui'

interface AppInfo {
  userData: string
  coversDir: string
  coverCount: number
  version: string
  platform: string
}

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export function DataPage({
  games,
  importGames,
  notify,
}: {
  games: Game[]
  importGames: (items: Game[], mode: 'merge' | 'overwrite') => Promise<ImportOutcome>
  notify: (msg: string, kind?: 'ok' | 'err') => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [overwriteOpen, setOverwriteOpen] = useState(false)

  const refreshInfo = useCallback(async () => {
    const i = await window.api?.appInfo()
    if (i) setInfo(i)
  }, [])

  useEffect(() => {
    refreshInfo()
  }, [refreshInfo, games.length])

  const exportJson = async () => {
    if (busy) return
    setBusy('json')
    try {
      const content = await buildBackup(games)
      const r = await window.api?.exportFile({
        defaultName: `GameShelf-备份-${stamp()}.json`,
        content,
        filters: [{ name: 'JSON 备份', extensions: ['json'] }],
      })
      if (r?.error) notify(r.error, 'err')
      else if (r?.path) notify(`已导出 ${games.length} 款游戏（含封面）`)
    } catch (e) {
      notify('导出失败：' + String((e as Error)?.message || e), 'err')
    } finally {
      setBusy(null)
    }
  }

  const exportCsv = async () => {
    if (busy) return
    setBusy('csv')
    try {
      const content = buildCsv(games)
      const r = await window.api?.exportFile({
        defaultName: `GameShelf-游戏列表-${stamp()}.csv`,
        content,
        filters: [{ name: 'CSV 表格', extensions: ['csv'] }],
      })
      if (r?.error) notify(r.error, 'err')
      else if (r?.path) notify('CSV 已导出，可用 Excel 打开')
    } finally {
      setBusy(null)
    }
  }

  const runImport = async (mode: 'merge' | 'overwrite') => {
    if (busy) return
    setBusy(mode)
    try {
      const picked = await window.api?.importJson()
      if (!picked || picked.canceled) return
      if (picked.error) {
        notify(picked.error, 'err')
        return
      }
      const parsed = parseBackup(picked.text || '')
      const existingNames = new Set(games.map((g) => g.name.trim().toLowerCase()))

      const ready: Game[] = []
      for (const item of parsed) {
        const willAdd = mode === 'overwrite' || !existingNames.has(item.name.trim().toLowerCase())
        let cover: string | null = null
        if (item.coverData && willAdd && window.api) {
          const saved = await window.api.saveCoverDataUrl(item.coverData)
          if (saved.file) cover = saved.file
        }
        const { coverData: _drop, ...rest } = item
        ready.push({ ...rest, cover })
      }

      const outcome = await importGames(ready, mode)
      if (mode === 'overwrite') {
        notify(`已覆盖恢复 ${outcome.added} 款游戏`)
      } else {
        notify(
          outcome.added
            ? `合并导入完成：新增 ${outcome.added} 款${outcome.skipped ? `，跳过同名 ${outcome.skipped} 款` : ''}`
            : `没有新增，${outcome.skipped} 款同名游戏已跳过`,
          outcome.added ? 'ok' : 'err',
        )
      }
      refreshInfo()
    } catch (e) {
      notify('导入失败：' + String((e as Error)?.message || e), 'err')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="pb-16">
      <div>
        <h1 className="text-[27px] font-semibold leading-none tracking-tight">数据管理</h1>
        <p className="mt-2 text-[12.5px] text-muted">
          数据全部保存在本机 · 共 {games.length} 款游戏
          {info ? ` · 封面 ${info.coverCount} 张` : ''}
        </p>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DataCard
          icon={<IconDatabase className="h-5 w-5" />}
          title="JSON 备份"
          desc="导出全部游戏信息和封面图片（封面以 Base64 内嵌），这是最完整的备份，换电脑也能恢复。"
        >
          <Button variant="primary" onClick={exportJson} disabled={Boolean(busy) || !games.length} data-testid="export-json">
            <IconDownload className="h-4 w-4" />
            {busy === 'json' ? '导出中…' : '导出 JSON'}
          </Button>
        </DataCard>

        <DataCard
          icon={<IconUpload className="h-5 w-5" />}
          title="JSON 恢复"
          desc="合并：保留现有游戏，只补充新游戏（同名跳过）。覆盖：清空当前数据后整体恢复。"
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => runImport('merge')} disabled={Boolean(busy)} data-testid="import-merge">
              合并导入
            </Button>
            <Button variant="danger" onClick={() => setOverwriteOpen(true)} disabled={Boolean(busy)} data-testid="import-overwrite">
              覆盖导入
            </Button>
          </div>
        </DataCard>

        <DataCard
          icon={<IconDatabase className="h-5 w-5" />}
          title="CSV 导出"
          desc="导出为表格文件，方便用 Excel / Numbers 查看或整理，不包含封面图片。"
        >
          <Button variant="ghost" onClick={exportCsv} disabled={Boolean(busy) || !games.length} data-testid="export-csv">
            <IconDownload className="h-4 w-4" />
            {busy === 'csv' ? '导出中…' : '导出 CSV'}
          </Button>
        </DataCard>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-panel/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14.5px] font-semibold">本地存储位置</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              游戏记录保存在 IndexedDB，封面是独立文件；两者都在下面这个目录里。
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refreshInfo()}>
            <IconExternal className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <PathRow
            label="数据目录"
            path={info?.userData || '读取中…'}
            onOpen={() => window.api?.openPath('data')}
          />
          <PathRow
            label="封面目录"
            path={info?.coversDir || '读取中…'}
            onOpen={() => window.api?.openPath('covers')}
          />
        </div>

        <div className="mt-4 rounded-xl border border-gold/15 bg-gold/[0.05] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#d9c79b]">
          建议每月导出一次 JSON 备份，放到网盘或移动硬盘。卸载应用或清空浏览器数据前，也请先导出一份。
        </div>
      </div>

      <ConfirmDialog
        open={overwriteOpen}
        title="覆盖导入会让当前数据被替换"
        message={`当前 ${games.length} 款游戏会被清空，然后恢复备份文件里的内容。这个操作不能撤销，建议先用「导出 JSON」备份一次。`}
        confirmText="先备份，我知道风险"
        cancelText="取消"
        danger
        onCancel={() => setOverwriteOpen(false)}
        onConfirm={() => {
          setOverwriteOpen(false)
          runImport('overwrite')
        }}
      />
    </div>
  )
}

function DataCard({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-panel/70 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gold">
        {icon}
      </div>
      <h2 className="mt-3 text-[14.5px] font-semibold">{title}</h2>
      <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-muted">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function PathRow({ label, path, onOpen }: { label: string; path: string; onOpen: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="w-[62px] shrink-0 text-[11.5px] text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[11.5px] text-white/70" title={path}>
        {path}
      </span>
      <Button variant="text" size="sm" onClick={onOpen}>
        打开
      </Button>
    </div>
  )
}
