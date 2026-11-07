/* global Request, ListWidget, DrawContext, Size, Color, Path, Point, Rect, Font, SFSymbol, Script, config */
// Runway home screen widget for the Scriptable iOS app. Fuel gauges, range and mood, never pounds.
// Setup: paste into a new Scriptable script, fill in APP and KEY, then add a Scriptable widget
// (small, medium or large) to the home screen and pick this script.

const APP = 'https://YOUR-APP.vercel.app'
const KEY = 'PASTE_WIDGET_KEY_HERE'

const WHITE = '#F4F5F7'
const MUTED = '#9AA3B2'
const PINK = '#FF6B8A'
const MOOD_COLOURS = { Comfortable: '#B8F25C', Careful: '#FF8A3D', Tight: PINK }

async function load() {
  try {
    const data = await new Request(`${APP}/api/widget?key=${encodeURIComponent(KEY)}`).loadJSON()
    if (data.error) throw new Error(data.error)
    return data
  } catch (e) {
    return { error: String(e.message || e) }
  }
}

// Same geometry as components/Gauge.tsx: E at 190°, F at -10°, 200° sweep
const angle = (v) => ((190 - 200 * v) * Math.PI) / 180
const at = (cx, cy, r, v) => new Point(cx + r * Math.cos(angle(v)), cy - r * Math.sin(angle(v)))

function line(ctx, a, b, colour, width) {
  const p = new Path()
  p.move(a)
  p.addLine(b)
  ctx.addPath(p)
  ctx.setStrokeColor(new Color(colour))
  ctx.setLineWidth(width)
  ctx.strokePath()
}

// Scriptable has no arc API, so the reserve zone is a short polyline
function gauge(ctx, cx, cy, r, fill, pace, colour) {
  const f = Math.max(0, Math.min(1, fill))
  const zone = []
  for (let i = 0; i <= 8; i++) zone.push(at(cx, cy, r * 1.05, (0.1 * i) / 8))
  const p = new Path()
  p.addLines(zone)
  ctx.addPath(p)
  ctx.setStrokeColor(new Color(PINK))
  ctx.setLineWidth(r * 0.08)
  ctx.strokePath()
  for (let i = 0; i <= 8; i++) {
    const v = i / 8
    const long = i % 4 === 0
    line(ctx, at(cx, cy, r * (long ? 0.8 : 0.87), v), at(cx, cy, r * 0.98, v), long ? WHITE : '#6B7280', long ? r * 0.06 : r * 0.035)
  }
  if (pace != null) {
    const tip = at(cx, cy, r * 1.04, pace)
    const a = angle(pace)
    const base = at(cx, cy, r * 1.22, pace)
    const nx = -Math.sin(a) * r * 0.09
    const ny = -Math.cos(a) * r * 0.09
    const tri = new Path()
    tri.addLines([tip, new Point(base.x + nx, base.y + ny), new Point(base.x - nx, base.y - ny)])
    tri.closeSubpath()
    ctx.addPath(tri)
    ctx.setFillColor(new Color(WHITE))
    ctx.fillPath()
  }
  line(ctx, new Point(cx, cy), at(cx, cy, r * 0.82, f), colour, r * 0.07)
  const hub = r * 0.12
  ctx.setFillColor(new Color('#0B0D12'))
  ctx.fillEllipse(new Rect(cx - hub, cy - hub, hub * 2, hub * 2))
  ctx.setStrokeColor(new Color(colour))
  ctx.setLineWidth(r * 0.05)
  ctx.strokeEllipse(new Rect(cx - hub, cy - hub, hub * 2, hub * 2))
}

function canvas(w, h) {
  const ctx = new DrawContext()
  ctx.size = new Size(w, h)
  ctx.opaque = false
  ctx.respectScreenScale = true
  return ctx
}

function totalGauge(g, size) {
  const ctx = canvas(size, size * 0.78)
  gauge(ctx, size / 2, size * 0.52, size * 0.4, g.total.fill, g.pace, WHITE)
  return ctx.getImage()
}

// Needs | Total | Wants side by side, with % under each
function cluster(g, width) {
  const h = width * 0.42
  const ctx = canvas(width, h)
  const dials = [
    ['Needs', g.needs.fill, '#4DA3FF', width * 0.17, width * 0.11],
    ['Total', g.total.fill, WHITE, width * 0.5, width * 0.16],
    ['Wants', g.wants.fill, '#FF8A3D', width * 0.83, width * 0.11],
  ]
  for (const [name, fill, colour, cx, r] of dials) {
    const cy = h * 0.58
    gauge(ctx, cx, cy, r, fill, g.pace, colour)
    ctx.setFont(Font.semiboldSystemFont(12))
    ctx.setTextColor(new Color(name === 'Wants' ? colour : MUTED))
    ctx.setTextAlignedCenter()
    ctx.drawTextInRect(`${name} ${Math.round(fill * 100)}%`, new Rect(cx - 50, cy + r * 0.45, 100, 16))
  }
  return ctx.getImage()
}

// Car-to-flag range line: lime as far as the money lasts, pink dashes for the gap
function road(range, width) {
  const ctx = canvas(width, 22)
  const x0 = 8
  const x1 = width - 10
  const reach = range.untilLoan > 0 ? Math.min(1, range.runwayDays / range.untilLoan) : 1
  const end = x0 + (x1 - x0) * reach
  line(ctx, new Point(x0, 14), new Point(end, 14), '#B8F25C', 4)
  for (let x = end + 5; x < x1; x += 9) line(ctx, new Point(x, 14), new Point(Math.min(x + 4, x1), 14), PINK, 4)
  line(ctx, new Point(x1 + 2, 20), new Point(x1 + 2, 2), WHITE, 2)
  ctx.setFillColor(new Color(WHITE))
  ctx.fillRect(new Rect(x1 + 3, 2, 7, 5))
  return ctx.getImage()
}

function text(parent, value, size, colour, bold) {
  const t = parent.addText(value)
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size)
  t.textColor = new Color(colour)
  return t
}

function chip(parent, mood) {
  const s = parent.addStack()
  s.backgroundColor = new Color(MOOD_COLOURS[mood], 0.15)
  s.cornerRadius = 10
  s.setPadding(4, 10, 4, 10)
  text(s, mood, 13, MOOD_COLOURS[mood], true)
}

function streak(parent, n) {
  const s = parent.addStack()
  s.centerAlignContent()
  const icon = s.addImage(SFSymbol.named('flame.fill').image)
  icon.imageSize = new Size(12, 12)
  icon.tintColor = new Color('#FF8A3D')
  s.addSpacer(3)
  text(s, String(n), 13, '#FF8A3D', true)
}

function savingsBar(parent, fill) {
  const row = parent.addStack()
  row.centerAlignContent()
  text(row, 'Savings', 12, MUTED)
  row.addSpacer(8)
  const ctx = canvas(150, 8)
  ctx.setFillColor(new Color('#262B36'))
  ctx.fillRect(new Rect(0, 0, 150, 8))
  ctx.setFillColor(new Color('#B8F25C'))
  ctx.fillRect(new Rect(0, 0, 150 * Math.min(1, fill), 8))
  row.addImage(ctx.getImage()).imageSize = new Size(150, 8)
  row.addSpacer()
  text(row, `${Math.round(fill * 100)}%`, 12, WHITE, true)
}

const data = await load()
const w = new ListWidget()
w.backgroundColor = new Color('#0B0D12')
w.url = `${APP}/dashboard`
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
// Previewing in the app (no widgetFamily) shows the medium size
const family = config.widgetFamily || 'medium'

if (data.error || !data.gauges) {
  text(w, `Runway unavailable\n${data.error || 'Update the app'}`, 12, MUTED)
} else if (family === 'small') {
  const top = w.addStack()
  top.addSpacer()
  streak(top, data.streak)
  w.addImage(totalGauge(data.gauges, 120)).centerAlignImage()
  const bottom = w.addStack()
  bottom.addSpacer()
  chip(bottom, data.mood)
  bottom.addSpacer()
} else {
  const range = { runwayDays: data.runwayDays, untilLoan: data.daysUntilLoan }
  if (family === 'large') {
    const head = w.addStack()
    text(head, 'Runway', 15, WHITE, true)
    head.addSpacer()
    const short = Math.round(data.shortfallDays || 0)
    text(head, short > 0 ? `${Math.round(data.runwayDays)} days · ${short} short` : `${Math.round(data.runwayDays)} days of range`, 12, short > 0 ? PINK : MUTED)
    w.addSpacer(6)
    w.addImage(road(range, 300)).imageSize = new Size(300, 22)
    w.addSpacer(14)
  }
  const head = w.addStack()
  head.centerAlignContent()
  chip(head, data.mood)
  head.addSpacer()
  streak(head, data.streak)
  w.addSpacer(4)
  w.addImage(cluster(data.gauges, 300)).imageSize = new Size(300, 126)
  w.addSpacer(6)
  savingsBar(w, data.gauges.savings)
  if (family === 'large') {
    w.addSpacer(10)
    text(w, data.nudge, 13, WHITE)
  }
}

Script.setWidget(w)
if (!config.runsInWidget) await w.presentMedium()
Script.complete()
