/* global Request, ListWidget, DrawContext, Size, Color, Path, Point, Rect, Font, SFSymbol, Script, config */
// Odo home screen widget for the Scriptable iOS app. Fuel gauges, range and mood, never pounds.
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

// Road to loan day, same drawing as components/LoanRoad.tsx (300x60): grey road, car at today,
// road block where fuel runs out, dimmed road past it, flag at loan day
function road(range) {
  const ctx = canvas(300, 60)
  const start = 4
  const end = 272
  const reach = range.untilLoan > 0 ? Math.min(1, range.runwayDays / range.untilLoan) : 1
  const block = start + (end - start) * reach
  const rounded = (x, w, colour) => {
    const p = new Path()
    p.addRoundedRect(new Rect(x, 34, w, 14), 5, 5)
    ctx.addPath(p)
    ctx.setFillColor(new Color(colour))
    ctx.fillPath()
  }
  rounded(start, end - start, '#2B2F38')
  if (reach < 1) rounded(block, end - block, '#1A1D23')
  for (let x = 44; x < block - 8; x += 13) line(ctx, new Point(x, 41), new Point(Math.min(x + 7, block - 8), 41), '#8A93A3', 1.6)
  // Car
  ctx.setFillColor(new Color('#A9C1E8'))
  const body = new Path()
  body.addRoundedRect(new Rect(10, 28, 33, 8), 3, 3)
  body.addRoundedRect(new Rect(17, 20.5, 19, 9), 3, 3)
  ctx.addPath(body)
  ctx.fillPath()
  for (const x of [18, 35]) {
    ctx.setFillColor(new Color('#14161B'))
    ctx.fillEllipse(new Rect(x - 3.6, 31.4, 7.2, 7.2))
  }
  // Road block
  if (reach < 1) {
    const x = block - 10
    line(ctx, new Point(x + 4, 30), new Point(x + 2, 52), '#C9CED8', 1.6)
    line(ctx, new Point(x + 16, 30), new Point(x + 18, 52), '#C9CED8', 1.6)
    ctx.setFillColor(new Color(WHITE))
    ctx.fillRect(new Rect(x, 25, 20, 7))
    ctx.setFillColor(new Color('#F08F86'))
    for (let k = 0; k < 4; k++) {
      const stripe = new Path()
      stripe.addLines([new Point(x + k * 5 + 1, 32), new Point(x + k * 5 + 4, 25), new Point(x + k * 5 + 6.5, 25), new Point(x + k * 5 + 3.5, 32)])
      stripe.closeSubpath()
      ctx.addPath(stripe)
      ctx.fillPath()
    }
    ctx.setFillColor(new Color('#F5B94A'))
    ctx.fillEllipse(new Rect(x + 7.6, 19.1, 4.8, 4.8))
  }
  // Flag
  line(ctx, new Point(286, 8), new Point(286, 40), WHITE, 1.8)
  ctx.setFillColor(new Color(WHITE))
  ctx.fillRect(new Rect(287, 8, 10, 7))
  ctx.setFillColor(new Color('#0B0D12'))
  for (const [fx, fy] of [[287, 8], [293.6, 8], [290.3, 11.5]]) ctx.fillRect(new Rect(fx, fy, 3.3, 3.5))
  return ctx.getImage()
}

// Savings as a fuel can that fills up (no clipping in Scriptable, so the fill is a rectangle inside the body)
function jerryCan(fill, h) {
  const ctx = canvas(44, 50)
  const f = Math.max(0, Math.min(1, fill))
  line(ctx, new Point(11, 12), new Point(11, 6), '#4A5160', 3)
  line(ctx, new Point(11, 6), new Point(23, 6), '#4A5160', 3)
  line(ctx, new Point(23, 6), new Point(23, 12), '#4A5160', 3)
  line(ctx, new Point(31, 13), new Point(38, 3), '#4A5160', 3)
  const body = new Path()
  body.addRoundedRect(new Rect(4, 12, 32, 36), 5, 5)
  ctx.addPath(body)
  ctx.setFillColor(new Color('#262B36'))
  ctx.fillPath()
  ctx.setFillColor(new Color('#B8F25C'))
  ctx.fillRect(new Rect(5.5, 13.5 + 33 * (1 - f), 29, 33 * f))
  ctx.addPath(body)
  ctx.setStrokeColor(new Color('#4A5160'))
  ctx.setLineWidth(2)
  ctx.strokePath()
  const img = ctx.getImage()
  return { img, size: new Size((h * 44) / 50, h) }
}

function savings(parent, fill, h) {
  const col = parent.addStack()
  col.layoutVertically()
  col.centerAlignContent()
  const can = jerryCan(fill, h)
  col.addImage(can.img).imageSize = can.size
  col.addSpacer(2)
  text(col, `${Math.round(fill * 100)}%`, 12, WHITE, true)
  text(col, 'Savings', 10, MUTED)
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

const data = await load()
const w = new ListWidget()
w.backgroundColor = new Color('#0B0D12')
w.url = `${APP}/dashboard`
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
// Previewing in the app (no widgetFamily) shows the medium size
const family = config.widgetFamily || 'medium'

if (data.error || !data.gauges) {
  text(w, `Odo unavailable\n${data.error || 'Update the app'}`, 12, MUTED)
} else if (family === 'small') {
  // Title says what the dial is: Needs + Wants in one tank, fuel left this week
  const top = w.addStack()
  top.centerAlignContent()
  const title = top.addStack()
  title.layoutVertically()
  text(title, 'Weekly fuel', 13, WHITE, true)
  text(title, 'Needs + wants', 10, MUTED)
  top.addSpacer()
  streak(top, data.streak)
  w.addSpacer(2)
  w.addImage(totalGauge(data.gauges, 104)).centerAlignImage()
  const bottom = w.addStack()
  bottom.centerAlignContent()
  text(bottom, `${Math.round(data.gauges.total.fill * 100)}% left`, 13, WHITE, true)
  bottom.addSpacer()
  text(bottom, data.gauges.total.status, 11, data.gauges.total.status === 'Too fast' ? '#FF8A3D' : MUTED)
} else {
  const short = Math.round(data.shortfallDays || 0)
  if (family === 'large') {
    const head = w.addStack()
    head.layoutVertically()
    text(head, 'Range', 12, MUTED)
    const row = head.addStack()
    row.bottomAlignContent()
    text(row, `${Math.round(data.runwayDays)} days`, 22, WHITE, true)
    row.addSpacer()
    text(row, short > 0 ? `${short} days short` : `${-short} days to spare`, 12, short > 0 ? PINK : '#B8F25C')
    w.addImage(road({ runwayDays: data.runwayDays, untilLoan: data.daysUntilLoan })).imageSize = new Size(300, 60)
    w.addSpacer(8)
  }
  const head = w.addStack()
  head.centerAlignContent()
  chip(head, data.mood)
  head.addSpacer()
  streak(head, data.streak)
  w.addSpacer(4)
  // Gauges on the left, jerry can on the right
  const row = w.addStack()
  row.centerAlignContent()
  const width = family === 'large' ? 240 : 225
  row.addImage(cluster(data.gauges, width)).imageSize = new Size(width, width * 0.42)
  row.addSpacer()
  savings(row, data.gauges.savings, family === 'large' ? 52 : 42)
  if (family === 'large') {
    w.addSpacer(10)
    text(w, data.nudge, 13, WHITE)
  }
}

Script.setWidget(w)
if (!config.runsInWidget) await w.presentMedium()
Script.complete()
