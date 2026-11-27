const { _electron: electron } = require('playwright-core')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const USER_DATA = '/tmp/gameshelf-demo'
const OUT = '/tmp/gameshelf-demo-shots'

const GAMES = [
  {
    name: '黑神话：悟空',
    platform: 'PC',
    genre: 'ARPG',
    score: '9.0',
    grade: 'S',
    completed: true,
    thoughts:
      '战斗手感扎实，Boss 设计有想法，中式美术是加分项。第三章之后节奏明显提速，结尾略显仓促。',
  },
  {
    name: '艾尔登法环',
    platform: 'PS5',
    genre: 'ARPG',
    score: '9.5',
    grade: 'S',
    completed: true,
    thoughts: '地图设计近乎教科书级别。第一次跌进地下世界那一段，至今没被超越。',
  },
  {
    name: '塞尔达传说：王国之泪',
    platform: 'Nintendo Switch',
    genre: '开放世界',
    score: '9.0',
    grade: 'S',
    completed: false,
    thoughts: '究极手给了玩家真正的自由度，代价是天空岛重复度偏高，后期有点疲劳。',
  },
  {
    name: '博德之门 3',
    platform: 'PS5',
    genre: 'RPG',
    score: '9.5',
    grade: 'S',
    completed: false,
    thoughts: '选择真的有后果，这是我玩过最像跑团的电子游戏。第二章节奏稍慢，但值得。',
  },
  {
    name: '哈迪斯',
    platform: 'PC',
    genre: 'Roguelike',
    score: '8.5',
    grade: 'A',
    completed: true,
    thoughts: '每一轮都在推进故事，死了也想再来一把。武器手感差异做得很好。',
  },
  {
    name: '空洞骑士',
    platform: 'Nintendo Switch',
    genre: '动作冒险',
    score: '8.5',
    grade: 'A',
    completed: true,
    thoughts: '探索欲极强，Boss 战节奏要求高。白色宫殿是真正的试炼。',
  },
  {
    name: '星露谷物语',
    platform: 'PC',
    genre: '模拟经营',
    score: '8.0',
    grade: 'B',
    completed: false,
    thoughts: '种地钓鱼挖矿，时间不知不觉就没了。适合疲惫的晚上。',
  },
  {
    name: '死亡搁浅',
    platform: 'PS5',
    genre: '动作冒险',
    score: '7.0',
    grade: 'C',
    completed: false,
    thoughts: '走路模拟器，但风景和音乐值得。前十小时确实劝退。',
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function addGame(win, g) {
  await win.getByRole('button', { name: /添加游戏/ }).first().click()
  await sleep(500)
  await win.getByTestId('game-name-input').fill(g.name)
  await win.getByLabel('游戏平台').selectOption({ label: g.platform })
  await win.getByLabel('游戏类型').selectOption({ label: g.genre })
  await win.getByLabel('个人评分').selectOption({ label: Number(g.score).toFixed(1) })
  await win.getByTestId(`grade-${g.grade}`).click()
  if (g.completed) await win.getByRole('button', { name: '已通关', exact: true }).click()
  await win.getByPlaceholder(/喜欢的地方/).fill(g.thoughts)

  // 百度图片取封面
  await win.getByRole('button', { name: /百度搜索封面/ }).click()
  const tiles = win.getByTestId('cover-tile')
  let n = 0
  for (let i = 0; i < 20; i++) {
    await sleep(700)
    n = await tiles.count()
    if (n > 0) break
  }
  if (n > 0) {
    const idx = n > 2 ? 1 : 0
    await tiles.nth(idx).click({ button: 'right' })
    await sleep(300)
    await win.getByRole('button', { name: '设为当前游戏封面' }).click()
    await sleep(2500)
  } else {
    // 没搜到结果：只关选图面板，别关掉表单
    const pickerInput = win.getByPlaceholder('输入游戏名称搜索百度图片')
    if (await pickerInput.isVisible().catch(() => false)) {
      await win.keyboard.press('Escape')
      await sleep(700)
      if (await pickerInput.isVisible().catch(() => false)) {
        await win.getByRole('button', { name: '关闭' }).last().click().catch(() => {})
        await sleep(500)
      }
    }
  }
  await win.getByTestId('save-game').click()
  await sleep(1000)
  console.log('added', g.name, 'tiles', n)
}

;(async () => {
  fs.rmSync(USER_DATA, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const app = await electron.launch({ args: [ROOT], env: { ...process.env, GS_E2E_USER_DATA: USER_DATA } })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')
  await sleep(2500)

  for (const g of GAMES) await addGame(win, g)

  await win.screenshot({ path: path.join(OUT, 'library.png') })

  await win.getByTestId('game-card').filter({ hasText: '艾尔登法环' }).click()
  await sleep(900)
  await win.screenshot({ path: path.join(OUT, 'detail.png') })
  await win.keyboard.press('Escape')
  await sleep(500)

  await win.getByRole('button', { name: '我的排行' }).first().click()
  await sleep(900)
  await win.screenshot({ path: path.join(OUT, 'ranking.png') })

  await win.getByRole('button', { name: '游戏库' }).first().click()
  await sleep(700)
  await win.getByTestId('game-card').filter({ hasText: '黑神话：悟空' }).click()
  await sleep(600)
  await win.getByTestId('game-card').first().waitFor({ timeout: 5000 }).catch(() => {})

  // 打开选图面板截图
  await win.getByRole('button', { name: '编辑' }).click().catch(async () => {
    await win.keyboard.press('Escape')
    await sleep(400)
    await win.getByTestId('game-card').filter({ hasText: '黑神话：悟空' }).click()
    await sleep(500)
    await win.getByRole('button', { name: '编辑' }).click()
  })
  await sleep(700)
  await win.screenshot({ path: path.join(OUT, 'form.png') })
  await win.getByRole('button', { name: /百度搜索封面/ }).click()
  await sleep(4000)
  await win.screenshot({ path: path.join(OUT, 'cover-search.png') })
  await win.keyboard.press('Escape')
  await sleep(400)
  await win.getByRole('button', { name: '取消' }).click()
  await sleep(500)

  await win.getByRole('button', { name: '数据管理' }).first().click()
  await sleep(900)
  await win.screenshot({ path: path.join(OUT, 'data.png') })

  console.log('DEMO_OK')
  await app.close()
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
