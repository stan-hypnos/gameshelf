// 百度图片搜索引擎封装：
// 不调用任何游戏数据库接口，只用真实百度图片搜索结果。
// 做法：常驻一个隐藏的 BrowserWindow（真实浏览器内核，带百度 Cookie / Referer），
// 在页面上下文里请求百度图片的 acjson 接口，拿到结构化的真实结果。
const { BrowserWindow, net, nativeImage, session } = require('electron')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

let engine = null
let engineKeyword = ''
let engineStatus = 'idle'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function createEngine() {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      images: true,
      backgroundThrottling: false,
      contextIsolation: true,
      sandbox: true,
    },
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.on('closed', () => {
    if (engine === win) {
      engine = null
      engineKeyword = ''
    }
  })
  win.webContents.on('render-process-gone', () => {
    if (engine === win) {
      engine = null
      engineKeyword = ''
    }
  })
  return win
}

async function getEngine(keyword) {
  if (!engine || engine.isDestroyed()) {
    engine = createEngine()
    engineKeyword = ''
    engineStatus = 'idle'
  }
  if (engineKeyword !== keyword) {
    engineStatus = 'loading'
    const url = `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(keyword)}`
    try {
      await engine.loadURL(url)
    } catch (e) {
      // 忽略加载报错，下面仍然尝试接口请求
    }
    // 给页面一点时间完成 Cookie / 风控初始化
    await sleep(900)
    engineKeyword = keyword
    engineStatus = 'ready'
  }
  return engine
}

function cleanTitle(t) {
  return String(t)
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .slice(0, 120)
}

async function searchBaiduImages(keyword, page = 0) {
  const kw = String(keyword || '').trim()
  if (!kw) return { items: [], total: 0, error: null }
  const win = await getEngine(kw)
  if (win.isDestroyed()) return { items: [], total: 0, error: '引擎窗口已关闭' }

  const pn = Math.max(0, Number(page) || 0) * 30
  const code = `(async () => {
    try {
      const u = new URL('https://image.baidu.com/search/acjson');
      const p = { tn: 'resultjson_com', logid: '1', ipn: 'rj', ct: '201326592', is: '', fp: 'result',
                  queryWord: ${JSON.stringify(kw)}, word: ${JSON.stringify(kw)}, pn: '${pn}', rn: '30', gsm: '1e' };
      for (const k of Object.keys(p)) u.searchParams.set(k, p[k]);
      const r = await fetch(u.toString(), { credentials: 'include', headers: { Accept: 'application/json, text/plain, */*' } });
      const t = await r.text();
      if (!r.ok) return { error: 'HTTP ' + r.status };
      if (t.indexOf('Forbid spider') >= 0) return { error: 'blocked' };
      const j = JSON.parse(t);
      const raw = Array.isArray(j.data) ? j.data : [];
      return {
        total: j.listNum || 0,
        items: raw.filter(function (x) { return x && (x.thumbURL || x.middleURL); }).map(function (x) {
          return {
            thumb: x.thumbURL || x.middleURL || x.hoverURL,
            full: x.middleURL || x.hoverURL || x.thumbURL,
            title: x.fromPageTitleEnc || '',
            width: x.width || 0,
            height: x.height || 0
          };
        })
      };
    } catch (e) {
      return { error: String((e && e.message) || e) };
    }
  })()`

  try {
    const res = await win.webContents.executeJavaScript(code, true)
    if (process.env.GS_DEBUG_BAIDU) {
      console.log('[baidu] raw keys:', res && Object.keys(res), 'items:', res && res.items && res.items.length)
      console.log('[baidu] sample:', JSON.stringify((res && res.items || []).slice(0, 2)).slice(0, 900))
    }
    const items = ((res && res.items) || [])
      .map((x) => ({
        thumb: x && x.thumb,
        full: (x && (x.full || x.thumb)) || '',
        title: cleanTitle((x && x.title) || ''),
        width: Number(x && x.width) || 0,
        height: Number(x && x.height) || 0,
      }))
      .filter((x) => x.thumb)
    const seen = new Set()
    const unique = items.filter((it) => {
      const k = it.full + '|' + it.thumb
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return { items: unique, total: (res && res.total) || 0, error: (res && res.error) || null }
  } catch (e) {
    return { items: [], total: 0, error: String((e && e.message) || e) }
  }
}

// 百度 CDN 会按 UA 返回 webp，Electron 无法转码；把 fmt 参数改成 jpeg 可拿到标准 JPEG
function preferJpeg(url) {
  try {
    const u = new URL(url)
    const fmt = u.searchParams.get('fmt')
    if (!fmt || /auto|webp/i.test(fmt)) u.searchParams.set('fmt', 'jpeg')
    return u.toString()
  } catch {
    return url.replace(/fmt=(auto|webp)/i, 'fmt=jpeg')
  }
}

async function fetchBinary(url) {
  const res = await net.fetch(preferJpeg(url), {
    headers: {
      'User-Agent': UA,
      Referer: 'https://image.baidu.com/',
      // 明确只要 JPEG / PNG：百度对支持 webp 的 UA 会返回 webp，Electron 无法转码
      Accept: 'image/jpeg,image/png',
    },
  })
  if (!res.ok) throw new Error('图片请求失败：HTTP ' + res.status)
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('图片内容为空')
  return buf
}

// 封面统一转成 2:3 友好的 JPEG，最长边 900，控制体积
async function normalizeImage(buf) {
  let img = nativeImage.createFromBuffer(buf)
  if (img.isEmpty()) throw new Error('无法解析图片')
  const size = img.getSize()
  const maxSide = 900
  if (Math.max(size.width, size.height) > maxSide) {
    img = size.width >= size.height ? img.resize({ width: maxSide }) : img.resize({ height: maxSide })
  }
  return img.toJPEG(86)
}

function saveCoverBuffer(buf, coversDir, ext = 'jpg') {
  fs.mkdirSync(coversDir, { recursive: true })
  const name = crypto.randomUUID() + '.' + ext
  fs.writeFileSync(path.join(coversDir, name), buf)
  return name
}

function isWebp(buf) {
  return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
}

async function downloadAndSaveCover(url, coversDir) {
  const buf = await fetchBinary(url)
  try {
    const jpeg = await normalizeImage(buf)
    return saveCoverBuffer(jpeg, coversDir, 'jpg')
  } catch (e) {
    // 兼容：个别图片仍返回 webp 时，原样保存（Chromium 能正常显示）
    if (isWebp(buf)) return saveCoverBuffer(buf, coversDir, 'webp')
    throw e
  }
}

async function saveDataUrlCover(dataUrl, coversDir) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ''))
  if (!m) throw new Error('封面数据格式不正确')
  const buf = Buffer.from(m[2], 'base64')
  const jpeg = await normalizeImage(buf)
  return saveCoverBuffer(jpeg, coversDir)
}

// 列表缩略图：走主进程代理，避开跨域 / Referer 限制，并压缩体积
const thumbCache = new Map()
async function proxyThumb(url) {
  if (!url) return null
  if (thumbCache.has(url)) return thumbCache.get(url)
  try {
    const buf = await fetchBinary(url)
    let img = nativeImage.createFromBuffer(buf)
    if (img.isEmpty()) return null
    const s = img.getSize()
    if (s.width > 420) img = img.resize({ width: 420 })
    const dataUrl = 'data:image/jpeg;base64,' + img.toJPEG(72).toString('base64')
    if (thumbCache.size > 240) thumbCache.clear()
    thumbCache.set(url, dataUrl)
    return dataUrl
  } catch (e) {
    return null
  }
}

function disposeEngine() {
  if (engine && !engine.isDestroyed()) engine.destroy()
  engine = null
  engineKeyword = ''
}

module.exports = {
  searchBaiduImages,
  downloadAndSaveCover,
  saveDataUrlCover,
  proxyThumb,
  disposeEngine,
  normalizeImage,
  fetchBinary,
  saveCoverBuffer,
  UA,
}
