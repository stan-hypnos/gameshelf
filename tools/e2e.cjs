const path = require('path')
const fs = require('fs')
const assert = require('assert')
const { _electron } = require('playwright-core')

const ROOT = path.resolve(__dirname, '..')
const DATA = '/tmp/gameshelf-e2e'
const EXPORT_DIR = '/tmp/gameshelf-e2e-export'
const IMPORT_FILE = '/tmp/gameshelf-e2e-import.json'
const SHOT = '/tmp/gameshelf-shots'

const steps = []
function step(name, extra = '') {
  steps.push(name)
  console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`)
}

async function readDb(win) {
  return win.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('gameshelf', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('games', { keyPath: 'id' })
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    return new Promise((res, rej) => {
      const tx = db.transaction('games', 'readonly')
      const req = tx.objectStore('games').getAll()
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
  })
}

async function main() {
  for (const d of [DATA, EXPORT_DIR, SHOT]) fs.rmSync(d, { recursive: true, force: true })
  for (const d of [DATA, EXPORT_DIR, SHOT]) fs.mkdirSync(d, { recursive: true })
  fs.rmSync(IMPORT_FILE, { force: true })

  const app = await _electron.launch({
    executablePath: require('electron'),
    args: [ROOT],
    cwd: ROOT,
    env: {
      ...process.env,
      GS_E2E_USER_DATA: DATA,
      GS_E2E_EXPORT_DIR: EXPORT_DIR,
      GS_E2E_IMPORT_FILE: IMPORT_FILE,
    },
  })

  const win = await app.firstWindow()
  const errors = []
  win.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  win.on('pageerror', (e) => errors.push(e.message))
  await win.waitForLoadState('domcontentloaded')
  await win.waitForTimeout(900)

  const dialog = () => win.locator('[role=dialog]')

  async function addGame({ name, platform, genre, score, grade, completed, thoughts }) {
    await win.getByTestId('add-game').click()
    await dialog().waitFor()
    await win.getByTestId('game-name-input').fill(name)
    if (platform) await win.getByLabel('游戏平台').selectOption({ label: platform })
    if (genre) await win.getByLabel('游戏类型').selectOption({ label: genre })
    if (score != null) await win.getByLabel('个人评分').selectOption({ label: score.toFixed(1) })
    if (grade) await win.getByTestId(`grade-${grade}`).click()
    if (completed != undefined) {
      await dialog().getByRole('button', { name: completed ? '已通关' : '未通关' }).click()
    }
    if (thoughts) await dialog().locator('textarea').fill(thoughts)
    await win.getByTestId('save-game').click()
    await dialog().waitFor({ state: 'detached' })
  }

  // 1. 新增游戏：必填校验
  await win.getByTestId('add-game').click()
  await dialog().waitFor()
  await win.getByTestId('save-game').click()
  assert.equal(await win.locator('text=请填写游戏名称').count(), 1, '空名称应提示')
  await win.keyboard.press('Escape')
  step('新增游戏：空名称被拦截')

  await addGame({
    name: '黑神话：悟空',
    platform: 'PC',
    genre: 'ARPG',
    score: 9,
    grade: 'S',
    completed: true,
    thoughts: '打击感一流，第一章的演出很强。\n唯一遗憾：优化一般。',
  })
  await addGame({
    name: '艾尔登法环',
    platform: 'PS5',
    genre: 'ARPG',
    score: 9.5,
    grade: 'S',
    completed: true,
    thoughts: '地图设计近乎教科书级别。',
  })
  await addGame({
    name: '空洞骑士',
    platform: 'Nintendo Switch',
    genre: '动作冒险',
    score: 8.5,
    grade: 'A',
    completed: false,
    thoughts: '氛围极好，难度偏高。',
  })
  await addGame({
    name: '星露谷物语',
    platform: 'PC',
    genre: '模拟经营',
    score: 8,
    grade: 'B',
    completed: false,
    thoughts: '慢节奏，很治愈。',
  })
  await addGame({ name: 'Balatro', platform: 'iOS', genre: 'Roguelike', grade: 'C' })

  const cards = await win.locator('[data-testid=game-card]').count()
  assert.equal(cards, 5, '应有 5 张卡片')
  step('新增 5 款游戏', `卡片数 ${cards}`)

  const dbGames = await readDb(win)
  assert.equal(dbGames.length, 5, 'IndexedDB 应有 5 条')
  assert.equal(dbGames.find((g) => g.name === 'Balatro').score, null, '未评分应为 null')
  assert.equal(dbGames.find((g) => g.name === 'Balatro').grade, 'C', '评分等级互相独立')
  step('数据落库：评分为 null、等级不被分数改写')

  await win.screenshot({ path: path.join(SHOT, '02-library.png') })

  // 2. 详情
  await win
    .locator('[data-testid=game-card][data-game-name="黑神话：悟空"]')
    .click()
  await dialog().waitFor()
  const detailText = await dialog().innerText()
  assert.match(detailText, /黑神话：悟空/)
  assert.match(detailText, /已通关/)
  assert.match(detailText, /9\.0/)
  assert.match(detailText, /个人感想/)
  assert.match(detailText, /打击感一流/)
  await win.screenshot({ path: path.join(SHOT, '03-detail.png') })
  step('详情弹窗显示完整信息与感想')
  await dialog().getByRole('button', { name: '关闭' }).click()
  await dialog().waitFor({ state: 'detached' })

  // 3. 搜索与筛选
  await win.locator('input[placeholder="搜索游戏名称…"]').fill('空洞')
  await win.waitForTimeout(150)
  assert.equal(await win.locator('[data-testid=game-card]').count(), 1, '搜索应只剩 1 款')
  await win.locator('input[placeholder="搜索游戏名称…"]').fill('')
  step('按名称即时搜索')

  await win.getByRole('button', { name: /^筛选/ }).click()
  await win.getByLabel('按平台筛选').selectOption({ label: 'PC' })
  await win.waitForTimeout(150)
  const pcCount = await win.locator('[data-testid=game-card]').count()
  assert.equal(pcCount, 2, 'PC 应有 2 款')
  await win.locator('button[title="神作"]').click()
  await win.waitForTimeout(150)
  assert.equal(await win.locator('[data-testid=game-card]').count(), 1, 'PC + S 应有 1 款')
  await win.screenshot({ path: path.join(SHOT, '04-filter.png') })
  step('组合筛选（平台 + 等级）')
  await win.getByRole('button', { name: '清除筛选条件' }).click()
  await win.waitForTimeout(150)

  // 4. 排序
  await win.getByLabel('排序').selectOption({ label: '评分从高到低' })
  await win.waitForTimeout(150)
  const firstCard = await win.locator('[data-testid=game-card]').first().getAttribute('data-game-name')
  assert.equal(firstCard, '艾尔登法环', '评分最高应排第一')
  step('排序：评分从高到低')
  await win.getByLabel('排序').selectOption({ label: '最近添加' })
  await win.waitForTimeout(100)

  // 5. 编辑：改等级后进入新分组
  await win
    .locator('[data-testid=game-card][data-game-name="空洞骑士"]')
    .click()
  await dialog().getByRole('button', { name: '编辑' }).click()
  await dialog().waitFor()
  await win.getByTestId('grade-C').click()
  await win.getByTestId('save-game').click()
  await dialog().waitFor({ state: 'detached' })
  const g2 = await readDb(win)
  assert.equal(g2.find((g) => g.name === '空洞骑士').grade, 'C', '等级应改为 C')
  step('编辑游戏并修改等级')

  // 6. 我的排行 & 拖动排序
  await win.getByTestId('tab-ranking').click()
  await win.waitForTimeout(200)
  assert.equal(
    await win.locator('[data-testid=rank-card][data-rank-grade="S"]').count(),
    2,
    'S 级应有 2 款',
  )
  const sCards = win.locator('[data-testid=rank-card][data-rank-grade="S"]')
  const beforeOrder = await sCards.evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-rank-id')),
  )
  await sCards.nth(1).dragTo(sCards.nth(0))
  await win.waitForTimeout(500)
  const afterOrder = await sCards.evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-rank-id')),
  )
  assert.notDeepEqual(beforeOrder, afterOrder, '拖动后顺序应变化')
  const afterDb = await readDb(win)
  const ranks = afterDb
    .filter((g) => g.grade === 'S')
    .sort((a, b) => a.rank - b.rank)
    .map((g) => g.name)
  assert.deepEqual(ranks, ['艾尔登法环', '黑神话：悟空'], '排名应持久化为拖动后的顺序')
  await win.screenshot({ path: path.join(SHOT, '05-ranking.png') })
  step('等级内拖动排序并自动保存', ranks.join(' > '))

  // 7. 刷新后数据仍在
  await win.reload()
  await win.waitForLoadState('domcontentloaded')
  await win.waitForTimeout(700)
  const afterReload = await readDb(win)
  assert.equal(afterReload.length, 5, '刷新后仍应有 5 条数据')
  await win.getByTestId('tab-library').click()
  await win.waitForTimeout(300)
  assert.equal(await win.locator('[data-testid=game-card]').count(), 5, '刷新后卡片数不变')
  step('刷新后数据仍在')

  // 8. 百度图片搜索封面 + 右键设为封面
  await win
    .locator('[data-testid=game-card][data-game-name="黑神话：悟空"]')
    .click()
  await dialog().getByRole('button', { name: '编辑' }).click()
  await dialog().waitFor()
  await dialog().getByRole('button', { name: /百度搜索封面/ }).click()
  const picker = win.locator('[role=dialog]').last()
  await picker.getByTestId('cover-tile').first().waitFor({ timeout: 45000 })
  const tileCount = await picker.getByTestId('cover-tile').count()
  assert.ok(tileCount >= 5, `百度搜索结果应足够多，实际 ${tileCount}`)
  await win.screenshot({ path: path.join(SHOT, '06-baidu-results.png') })
  step('百度图片搜索返回真实结果', `${tileCount} 张`)

  await picker.getByTestId('cover-tile').first().click({ button: 'right' })
  await win.getByRole('button', { name: '设为当前游戏封面' }).click()
  await win.waitForTimeout(1200)
  const coverSrc = await dialog().locator('img[src^="app://gameshelf/covers/"]').first().getAttribute('src')
  assert.ok(coverSrc, '表单里应显示新封面')
  const coverFile = decodeURIComponent(coverSrc.split('/covers/')[1])
  assert.ok(fs.existsSync(path.join(DATA, 'covers', coverFile)), '封面文件应保存到本地')
  step('右键选择封面并保存到本地', coverFile)

  await win.getByTestId('save-game').click()
  await dialog().waitFor({ state: 'detached' })
  await win.waitForTimeout(400)
  const savedGame = (await readDb(win)).find((g) => g.name === '黑神话：悟空')
  assert.equal(savedGame.cover, coverFile, '封面文件名应写入数据库')
  const cardImg = await win
    .locator('[data-testid=game-card][data-game-name="黑神话：悟空"] img')
    .getAttribute('src')
  assert.ok(cardImg && cardImg.includes(coverFile), '卡片应显示本地封面')
  await win.screenshot({ path: path.join(SHOT, '07-library-with-cover.png') })
  step('封面写入数据库并在卡片显示')

  // 9. 百度网页窗口右键流程
  await win
    .locator('[data-testid=game-card][data-game-name="艾尔登法环"]')
    .click()
  await dialog().getByRole('button', { name: '编辑' }).click()
  await dialog().getByRole('button', { name: /百度搜索封面/ }).click()
  await dialog().getByRole('button', { name: /网页中挑选/ }).click()
  let baiduPage = null
  for (let i = 0; i < 40 && !baiduPage; i++) {
    await win.waitForTimeout(500)
    const candidates = (await app.windows()).filter((w) => w.url().includes('image.baidu.com'))
    for (const cand of candidates) {
      const isVisiblePicker = await cand
        .evaluate(() => Boolean(window.__gsBaiduPage))
        .catch(() => false)
      if (isVisiblePicker) {
        baiduPage = cand
        break
      }
    }
  }
  if (baiduPage) {
    let picked = null
    for (let i = 0; i < 24 && !picked; i++) {
      await baiduPage.waitForTimeout(500)
      picked = await baiduPage
        .evaluate(() => {
          const img = Array.from(document.querySelectorAll('img')).find(
            (i) => (i.src || '').includes('/it/u=') && i.naturalWidth > 200,
          )
          return img ? img.src : null
        })
        .catch(() => null)
    }
    assert.ok(picked, '百度网页里应加载出结果图片')
    await baiduPage.evaluate(() => {
      const img = Array.from(document.querySelectorAll('img')).find(
        (i) => (i.src || '').includes('/it/u=') && i.naturalWidth > 200,
      )
      if (!img) return null
      img.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
      )
      return img.src
    })
    assert.ok(picked, '百度网页里应能找到可右键的结果图片')
    assert.ok(picked, '百度网页里应能找到可右键的结果图片')
    let formCover = null
    for (let i = 0; i < 20 && !formCover; i++) {
      await win.waitForTimeout(500)
      formCover = await dialog()
        .locator('img[src^="app://gameshelf/covers/"]')
        .first()
        .getAttribute('src')
        .catch(() => null)
    }
    assert.ok(formCover, '网页里右键图片后主窗口应收到封面')
    const pickedFile = decodeURIComponent(formCover.split('/covers/')[1])
    assert.ok(fs.existsSync(path.join(DATA, 'covers', pickedFile)), '网页右键封面应保存到本地')
    step('百度网页内右键图片也能回传封面', pickedFile)
    await baiduPage.close().catch(() => {})
  } else {
    throw new Error('没有打开百度图片网页窗口')
  }

  for (let i = 0; i < 5 && (await dialog().count()); i++) {
    await win.keyboard.press('Escape')
    await win.waitForTimeout(250)
    const closeBtn = dialog().getByRole('button', { name: '关闭' }).first()
    if (await closeBtn.count()) await closeBtn.click().catch(() => {})
    await win.waitForTimeout(250)
  }

  // 10. JSON / CSV 导出
  await win.getByTestId('tab-data').click()
  await win.waitForTimeout(300)
  await win.getByTestId('export-json').click()
  await win.waitForTimeout(800)
  const exported = fs.readdirSync(EXPORT_DIR).filter((f) => f.endsWith('.json'))
  assert.ok(exported.length === 1, '应导出 1 个 JSON')
  const backupText = fs.readFileSync(path.join(EXPORT_DIR, exported[0]), 'utf8')
  const backup = JSON.parse(backupText)
  assert.equal(backup.games.length, 5, '备份应含 5 款游戏')
  assert.ok(backup.games.find((g) => g.name === '黑神话：悟空').coverData?.startsWith('data:image'), '备份应内嵌封面')
  fs.copyFileSync(path.join(EXPORT_DIR, exported[0]), IMPORT_FILE)
  step('JSON 备份导出（含封面 Base64）', `${backupText.length} 字节`)

  await win.getByTestId('export-csv').click()
  await win.waitForTimeout(600)
  const csvFiles = fs.readdirSync(EXPORT_DIR).filter((f) => f.endsWith('.csv'))
  assert.equal(csvFiles.length, 1, '应导出 1 个 CSV')
  const csvText = fs.readFileSync(path.join(EXPORT_DIR, csvFiles[0]), 'utf8')
  assert.ok(csvText.startsWith('\uFEFF游戏名称,游戏平台,游戏类型,个人评分,个人等级,是否通关,个人感想,添加时间'))
  assert.equal(csvText.trim().split('\r\n').length, 6, 'CSV 应有表头 + 5 行')
  assert.match(csvText, /"打击感一流，第一章的演出很强。\n唯一遗憾：优化一般。"/)
  step('CSV 导出（含换行转义）')

  // 11. 删除 + 覆盖恢复
  await win.getByTestId('tab-library').click()
  await win.waitForTimeout(200)
  await win.locator('[data-testid=game-card][data-game-name="星露谷物语"]').click()
  await dialog().getByRole('button', { name: '删除游戏' }).click()
  await win.getByRole('button', { name: '删除', exact: true }).click()
  await win.waitForTimeout(500)
  assert.equal(await win.locator('[data-testid=game-card]').count(), 4, '删除后剩 4 款')
  step('删除游戏（二次确认）')

  await win.getByTestId('tab-data').click()
  await win.waitForTimeout(200)
  await win.getByTestId('import-overwrite').click()
  await win.getByRole('button', { name: '先备份，我知道风险' }).click()
  await win.waitForTimeout(1500)
  await win.getByTestId('tab-library').click()
  await win.waitForTimeout(300)
  assert.equal(await win.locator('[data-testid=game-card]').count(), 5, '覆盖恢复后应回到 5 款')
  step('JSON 覆盖导入恢复数据')

  // 合并导入：同名应跳过
  await win.getByTestId('tab-data').click()
  await win.waitForTimeout(200)
  await win.getByTestId('import-merge').click()
  await win.waitForTimeout(1200)
  const mergedCount = (await readDb(win)).length
  assert.equal(mergedCount, 5, '合并同名不应重复新增')
  step('JSON 合并导入（同名跳过）')

  await win.screenshot({ path: path.join(SHOT, '08-data.png') })
  await win.getByTestId('tab-library').click()
  await win.waitForTimeout(300)
  await win.screenshot({ path: path.join(SHOT, '09-library-final.png') })

  if (errors.length) {
    console.log('CONSOLE_ERRORS', JSON.stringify(errors.slice(0, 10), null, 2))
  } else {
    console.log('无渲染层报错')
  }

  await app.close()
  console.log(`\n全部 ${steps.length} 项通过`)
}

main().catch(async (e) => {
  console.error('FAILED:', e.message)
  console.error(e.stack)
  process.exit(1)
})
