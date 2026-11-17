#!/usr/bin/env node
// Generates the mock catalog used by the game flow until Supabase is connected (phase 8):
// three categories of simple SVG "photos" and public/mock/catalog.json.
// Run: node scripts/generate-mock.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'mock')

/** answerPhoto: also render a labelled answer photo; vertical: portrait 9:16. */
const ITEMS = [
  { id: 'red-circle', answer: 'Червоне коло', shape: 'circle', color: '#E5484D' },
  { id: 'blue-square', answer: 'Синій квадрат', shape: 'square', color: '#3B82F6' },
  {
    id: 'green-triangle',
    answer: 'Зелений трикутник',
    shape: 'triangle',
    color: '#30A46C',
    answerPhoto: true,
  },
  { id: 'yellow-star', answer: 'Жовта зірка', shape: 'star', color: '#F5C524' },
  {
    id: 'purple-hexagon',
    answer: 'Фіолетовий шестикутник',
    shape: 'hexagon',
    color: '#8B5CF6',
    vertical: true,
  },
  { id: 'orange-ring', answer: 'Помаранчеве кільце', shape: 'ring', color: '#F97316' },
  {
    id: 'cyan-diamond',
    answer: 'Блакитний ромб',
    shape: 'diamond',
    color: '#3BC9F5',
    answerPhoto: true,
  },
  { id: 'pink-heart', answer: 'Рожеве серце', shape: 'heart', color: '#EC4899' },
  { id: 'white-cross', answer: 'Білий хрест', shape: 'cross', color: '#F3F4F6', vertical: true },
  { id: 'lime-pentagon', answer: 'Салатовий пʼятикутник', shape: 'pentagon', color: '#A3E635' },
  { id: 'brown-oval', answer: 'Коричневий овал', shape: 'oval', color: '#A16207' },
  { id: 'teal-arrow', answer: 'Бірюзова стрілка', shape: 'arrow', color: '#14B8A6' },
]

function polygon(cx, cy, r, n, rotation = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rotation + (i * 2 * Math.PI) / n
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

function star(cx, cy, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

function shapeSvg(shape, color, cx, cy, r) {
  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
    case 'square':
      return `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.08}" fill="${color}"/>`
    case 'triangle':
      return `<polygon points="${polygon(cx, cy + r * 0.15, r * 1.1, 3)}" fill="${color}"/>`
    case 'star':
      return `<polygon points="${star(cx, cy, r * 1.1)}" fill="${color}"/>`
    case 'hexagon':
      return `<polygon points="${polygon(cx, cy, r, 6, 0)}" fill="${color}"/>`
    case 'pentagon':
      return `<polygon points="${polygon(cx, cy, r, 5)}" fill="${color}"/>`
    case 'ring':
      return `<circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="none" stroke="${color}" stroke-width="${r * 0.35}"/>`
    case 'diamond':
      return `<polygon points="${polygon(cx, cy, r * 1.1, 4)}" fill="${color}"/>`
    case 'oval':
      return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.3}" ry="${r * 0.75}" fill="${color}"/>`
    case 'cross': {
      const w = r * 0.38
      return `<path d="M${cx - w} ${cy - r}h${2 * w}v${r - w}h${r - w}v${2 * w}h${-(r - w)}v${r - w}h${-2 * w}v${-(r - w)}h${-(r - w)}v${-2 * w}h${r - w}z" fill="${color}"/>`
    }
    case 'heart':
      return `<path d="M${cx} ${cy + r * 0.9} C ${cx - r * 1.6} ${cy - r * 0.1}, ${cx - r * 0.7} ${cy - r * 1.3}, ${cx} ${cy - r * 0.45} C ${cx + r * 0.7} ${cy - r * 1.3}, ${cx + r * 1.6} ${cy - r * 0.1}, ${cx} ${cy + r * 0.9} z" fill="${color}"/>`
    case 'arrow': {
      const t = r * 0.3
      return `<path d="M${cx - r} ${cy - t}h${r}v${-t * 1.6}l${r} ${t * 2.6}l${-r} ${t * 2.6}v${-t * 1.6}h${-r}z" fill="${color}"/>`
    }
    default:
      throw new Error(`Unknown shape ${shape}`)
  }
}

const DIGITS = [
  ['Нуль', '#E5484D'],
  ['Один', '#F5A524'],
  ['Два', '#30A46C'],
  ['Три', '#3BC9F5'],
  ['Чотири', '#8B5CF6'],
  ['Пʼять', '#EC4899'],
  ['Шість', '#F97316'],
  ['Сім', '#A3E635'],
  ['Вісім', '#14B8A6'],
  ['Девʼять', '#F5C524'],
].map(([answer, color], n) => ({
  id: `digit-${n}`,
  answer,
  draw: (w, h, cy) =>
    `<text x="${w / 2}" y="${cy}" fill="${color}" font-family="Inter, system-ui, sans-serif" font-size="${Math.round(Math.min(w, h) * 0.7)}" font-weight="800" text-anchor="middle" dominant-baseline="central">${n}</text>`,
  vertical: n === 1 || n === 7,
  answerPhoto: n === 8,
}))

const DIRECTIONS = [
  ['Вправо', 0],
  ['Вниз-вправо', 45],
  ['Вниз', 90],
  ['Вниз-вліво', 135],
  ['Вліво', 180],
  ['Вгору-вліво', 225],
  ['Вгору', 270],
  ['Вгору-вправо', 315],
]
const ARROWS = DIRECTIONS.map(([answer, deg], i) => ({
  id: `arrow-${deg}`,
  answer,
  draw: (w, h, cy) => {
    const r = Math.min(w, h) * 0.3
    return `<g transform="rotate(${deg} ${w / 2} ${cy})">${shapeSvg('arrow', '#F3F4F6', w / 2, cy, r)}</g>`
  },
  vertical: i === 2,
  answerPhoto: false,
}))

const SHAPES = ITEMS.map((item) => ({
  ...item,
  draw: (w, h, cy) => shapeSvg(item.shape, item.color, w / 2, cy, Math.min(w, h) * 0.28),
}))

const CATEGORIES = [
  { id: 'shapes', name: 'Фігури та кольори', items: SHAPES },
  { id: 'digits', name: 'Цифри', items: DIGITS },
  { id: 'arrows', name: 'Стрілки', items: ARROWS },
]

function photoSvg(item, { answer = false } = {}) {
  const [w, h] = item.vertical ? [900, 1600] : [1600, 900]
  const cy = answer ? h * 0.42 : h / 2
  const label = answer
    ? `<text x="${w / 2}" y="${h * 0.85}" fill="#F3F4F6" font-family="Inter, system-ui, sans-serif" font-size="${Math.round(Math.min(w, h) * 0.07)}" font-weight="700" text-anchor="middle">${item.answer}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${answer ? '#1F2937' : '#2A3040'}"/>
${item.draw(w, h, cy)}
${label}
</svg>
`
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const catalog = CATEGORIES.map((category) => {
  mkdirSync(join(outDir, category.id), { recursive: true })
  const photos = category.items.map((item) => {
    const base = `${category.id}/${item.id}`
    writeFileSync(join(outDir, `${base}.svg`), photoSvg(item))
    if (item.answerPhoto) {
      writeFileSync(join(outDir, `${base}.answer.svg`), photoSvg(item, { answer: true }))
    }
    return {
      id: `${category.id}-${item.id}`,
      src: `/mock/${base}.svg`,
      answerSrc: item.answerPhoto ? `/mock/${base}.answer.svg` : null,
      answer: item.answer,
      isVertical: Boolean(item.vertical),
    }
  })
  return { id: category.id, name: category.name, photos }
})

writeFileSync(join(outDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`)
for (const c of catalog) console.log(`${c.name}: ${c.photos.length} photos`)
