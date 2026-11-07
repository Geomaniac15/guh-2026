/* global Request, ListWidget, DrawContext, Size, Color, Path, Point, Rect, Font, SFSymbol, Script, config */
// Runway home screen widget for the Scriptable iOS app. Shows rings and mood, never pounds.
// Setup: paste into a new Scriptable script, fill in APP and KEY, then add a Scriptable widget
// (small or medium) to the home screen and pick this script.

const APP = 'https://YOUR-APP.vercel.app'
const KEY = 'PASTE_WIDGET_KEY_HERE'

const RING_COLOURS = ['#FF8A3D', '#B8F25C', '#4DA3FF']
const MOOD_COLOURS = { Comfortable: '#B8F25C', Careful: '#FF8A3D', Tight: '#FF6B8A' }

async function load() {
  try {
    const data = await new Request(`${APP}/api/widget?key=${encodeURIComponent(KEY)}`).loadJSON()
    if (data.error) throw new Error(data.error)
    return data
  } catch (e) {
    return { error: String(e.message || e) }
  }
}

// Scriptable has no arc API, so draw each ring as a polyline with round end caps
function arc(ctx, c, r, p, colour, width, caps) {
  const steps = Math.max(2, Math.round(120 * p))
  const pts = []
  for (let s = 0; s <= steps; s++) {
    const a = -Math.PI / 2 + 2 * Math.PI * p * (s / steps)
    pts.push(new Point(c + r * Math.cos(a), c + r * Math.sin(a)))
  }
  const path = new Path()
  path.addLines(pts)
  ctx.addPath(path)
  ctx.setStrokeColor(colour)
  ctx.setLineWidth(width)
  ctx.strokePath()
  if (caps) {
    ctx.setFillColor(colour)
    for (const pt of [pts[0], pts[pts.length - 1]]) ctx.fillEllipse(new Rect(pt.x - width / 2, pt.y - width / 2, width, width))
  }
}

function rings(progress, size) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const stroke = size * 0.11
  const gap = stroke * 0.25
  progress.forEach((p, i) => {
    const r = size / 2 - stroke / 2 - i * (stroke + gap)
    arc(ctx, size / 2, r, 1, new Color(RING_COLOURS[i], 0.2), stroke, false)
    if (p > 0) arc(ctx, size / 2, r, Math.min(1, p), new Color(RING_COLOURS[i]), stroke, true)
  })
  return ctx.getImage()
}

function chip(parent, mood, label) {
  const s = parent.addStack()
  s.backgroundColor = new Color(MOOD_COLOURS[mood], 0.15)
  s.cornerRadius = 10
  s.setPadding(4, 10, 4, 10)
  const t = s.addText(label)
  t.font = Font.boldSystemFont(13)
  t.textColor = new Color(MOOD_COLOURS[mood])
}

function streak(parent, n) {
  const s = parent.addStack()
  s.centerAlignContent()
  const icon = s.addImage(SFSymbol.named('flame.fill').image)
  icon.imageSize = new Size(12, 12)
  icon.tintColor = new Color('#FF8A3D')
  s.addSpacer(3)
  const t = s.addText(String(n))
  t.font = Font.boldSystemFont(13)
  t.textColor = new Color('#FF8A3D')
}

const data = await load()
const w = new ListWidget()
w.backgroundColor = new Color('#0B0D12')
w.url = `${APP}/dashboard`
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
// Previewing in the app (no widgetFamily) shows the medium size
const medium = config.widgetFamily ? config.widgetFamily === 'medium' : true

if (data.error) {
  const t = w.addText(`Runway unavailable\n${data.error}`)
  t.font = Font.systemFont(12)
  t.textColor = new Color('#9AA3B2')
} else if (medium) {
  const row = w.addStack()
  row.centerAlignContent()
  row.addImage(rings(data.rings, 110)).imageSize = new Size(110, 110)
  row.addSpacer(14)
  const col = row.addStack()
  col.layoutVertically()
  const top = col.addStack()
  top.centerAlignContent()
  chip(top, data.mood, data.mood === 'Careful' ? 'Careful today' : data.mood)
  top.addSpacer()
  streak(top, data.streak)
  col.addSpacer(8)
  const n = col.addText(data.nudge)
  n.font = Font.systemFont(14)
  n.textColor = new Color('#F4F5F7')
} else {
  const top = w.addStack()
  top.addImage(rings(data.rings, 76)).imageSize = new Size(76, 76)
  top.addSpacer()
  streak(top, data.streak)
  w.addSpacer()
  chip(w, data.mood, data.mood)
}

Script.setWidget(w)
if (!config.runsInWidget) await (medium ? w.presentMedium() : w.presentSmall())
Script.complete()
