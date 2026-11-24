#!/usr/bin/env node
// Fails when the app's source has a require cycle (a -> b -> ... -> a).
//
// Metro warns "Require cycle: ..." at runtime for each of them, and a module
// reached through a cycle can be read before it is initialised. This walks the
// static import graph of src/ the way Metro resolves it and reports every cycle
// once. No dependency, no network.
//
//   node scripts/check-cycles.mjs [--src src] [--max 500]
//
// What counts as an edge: `import … from`, `export … from`, `import 'x'` and
// `require('x')` (type-only imports do not: `import type`, `export type … from`
// and `import { type A, type B } from` when every specifier is a type).
// Dynamic `import('x')` is not an edge: it is loaded lazily, after the cycle
// could matter.
// Resolution: relative paths with Metro's extensions (platform variants .ios,
// .android and .native too) and `index` files; the aliases of babel.config.js
// and tsconfig.json: `@` -> src, `@ui` -> src/ui/index.tsx, `@components` ->
// src/@/components/native/index.js. src/@/components (a git submodule) is a
// leaf: it is a node of the graph but it is never walked into. Tests
// (`__tests__`, `*.test.*`, `jest/`) are not part of the graph.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : def
}
const srcDir = path.resolve(repo, opt('src', 'src'))
const MAX = Number(opt('max', '500'))

const SUBMODULE = path.join(repo, 'src', '@', 'components') + path.sep
const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const PLATFORMS = ['', '.ios', '.android', '.native']
const RESOLVE_EXT = [...CODE_EXT, '.json']
const ALIASES = [
  ['@ui', path.join(repo, 'src/ui/index.tsx')],
  ['@components', path.join(repo, 'src/@/components/native/index.js')],
  ['@', path.join(repo, 'src')]
]

const isSubmodule = (f) => f.startsWith(SUBMODULE)
const isTest = (f) => /(^|\/)(__tests__|jest)\//.test(path.relative(repo, f)) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(f)
const isFile = (f) => {
  try { return fs.statSync(f).isFile() } catch { return false }
}

// Every file that a path can mean (the file itself, with an extension, or a directory's index).
function candidates (base) {
  const out = new Set()
  const add = (f) => { if (isFile(f) && !f.endsWith('.d.ts')) out.add(f) }
  if (isFile(base) && !/\.d\.ts$/.test(base)) add(base)
  for (const p of PLATFORMS) for (const e of RESOLVE_EXT) add(base + p + e)
  for (const p of PLATFORMS) for (const e of RESOLVE_EXT) add(path.join(base, 'index' + p + e))
  return [...out]
}

function resolve (from, spec) {
  let base = null
  if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else {
    for (const [alias, target] of ALIASES) {
      if (spec === alias) { base = target; break }
      if (spec.startsWith(alias + '/')) {
        // `@/x` is src/x; `@ui/x` and `@components/x` are not used, but would sit next to their target.
        const root = alias === '@' ? target : path.dirname(target)
        base = path.join(root, spec.slice(alias.length + 1))
        break
      }
    }
  }
  if (!base) return [] // a package of node_modules (or a Node builtin)
  return candidates(base).filter((f) => !isTest(f))
}

// Replaces comments with spaces (kept: strings and template literals, which can contain `//`).
function stripComments (s) {
  let out = ''
  let i = 0
  while (i < s.length) {
    const c = s[i]
    const n = s[i + 1]
    if (c === '/' && n === '/') {
      while (i < s.length && s[i] !== '\n') i++
    } else if (c === '/' && n === '*') {
      const end = s.indexOf('*/', i + 2)
      i = end < 0 ? s.length : end + 2
      out += ' '
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < s.length && s[j] !== c) {
        if (s[j] === '\\') j++
        else if (c !== '`' && s[j] === '\n') break
        j++
      }
      out += s.slice(i, j + 1)
      i = j + 1
    } else {
      out += c
      i++
    }
  }
  return out
}

// `{ type A, type B }` and `type { A }` carry no runtime import.
function onlyTypes (clause) {
  const c = clause.trim()
  if (/^type\s+[\w$*{]/.test(c)) return true // `import type X`, `import type { X }`, `export type { X }`
  const m = c.match(/\{([\s\S]*)\}/)
  if (!m) return false // default or namespace import: a value
  if (/^[\w$]+\s*,/.test(c)) return false // `import A, { type B }`: the default is a value
  const specs = m[1].split(',').map((x) => x.trim()).filter(Boolean)
  return specs.length > 0 && specs.every((x) => /^type\s+[\w$]/.test(x))
}

function specifiersOf (file) {
  const code = stripComments(fs.readFileSync(file, 'utf8'))
  const specs = new Set()
  let m
  // import … from 'x' / export … from 'x' (the clause holds no quote nor semicolon)
  const fromRe = /(?:^|[;{}\n])\s*(import|export)\b([^;'"`]*?)\bfrom\s*(['"])([^'"\n]+)\3/g
  while ((m = fromRe.exec(code))) {
    if (!onlyTypes(m[2])) specs.add(m[4])
  }
  // import 'x'
  const sideRe = /(?:^|[;{}\n])\s*import\s*(['"])([^'"\n]+)\1/g
  while ((m = sideRe.exec(code))) specs.add(m[2])
  // require('x')
  const reqRe = /(?<![\w$.])require\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g
  while ((m = reqRe.exec(code))) specs.add(m[2])
  return specs
}

// ---- the graph ----------------------------------------------------------------
const graph = new Map() // file -> Set<file>

function walkDir (dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__' || (f + path.sep) === SUBMODULE) continue
      walkDir(f, acc)
    } else if (CODE_EXT.includes(path.extname(f)) && !f.endsWith('.d.ts') && !isTest(f)) acc.push(f)
  }
  return acc
}

const queue = walkDir(srcDir, [])
for (let q = 0; q < queue.length; q++) {
  const file = queue[q]
  if (graph.has(file)) continue
  const edges = new Set()
  graph.set(file, edges)
  if (isSubmodule(file) || !CODE_EXT.includes(path.extname(file))) continue // leaves
  for (const spec of specifiersOf(file)) {
    for (const target of resolve(file, spec)) {
      if (target === file) continue
      edges.add(target)
      if (!graph.has(target)) queue.push(target)
    }
  }
}

// ---- strongly connected components (Tarjan), then the elementary cycles of each -
const nodes = [...graph.keys()].sort()
const index = new Map(nodes.map((n, i) => [n, i]))
const adj = nodes.map((n) => [...graph.get(n)].filter((t) => index.has(t)).map((t) => index.get(t)).sort((a, b) => a - b))

const sccs = []
{
  let counter = 0
  const idx = new Array(nodes.length).fill(-1)
  const low = new Array(nodes.length).fill(0)
  const on = new Array(nodes.length).fill(false)
  const stack = []
  for (let root = 0; root < nodes.length; root++) {
    if (idx[root] !== -1) continue
    const work = [[root, 0]]
    idx[root] = low[root] = counter++
    stack.push(root); on[root] = true
    while (work.length) {
      const top = work[work.length - 1]
      const [v, i] = top
      if (i < adj[v].length) {
        top[1]++
        const w = adj[v][i]
        if (idx[w] === -1) {
          idx[w] = low[w] = counter++
          stack.push(w); on[w] = true
          work.push([w, 0])
        } else if (on[w]) low[v] = Math.min(low[v], idx[w])
      } else {
        if (low[v] === idx[v]) {
          const comp = []
          let w
          do { w = stack.pop(); on[w] = false; comp.push(w) } while (w !== v)
          if (comp.length > 1) sccs.push(comp)
        }
        work.pop()
        if (work.length) {
          const parent = work[work.length - 1][0]
          low[parent] = Math.min(low[parent], low[v])
        }
      }
    }
  }
}

const cycles = []
let truncated = false
for (const comp of sccs) {
  const inComp = new Set(comp)
  const sorted = [...comp].sort((a, b) => a - b)
  for (const start of sorted) {
    // cycles whose smallest node is `start`: each one is found once
    const path_ = [start]
    const onPath = new Set([start])
    const dfs = (v) => {
      for (const w of adj[v]) {
        if (truncated) return
        if (!inComp.has(w) || w < start) continue
        if (w === start) {
          if (cycles.length >= MAX) { truncated = true; return }
          cycles.push([...path_, start])
        } else if (!onPath.has(w)) {
          onPath.add(w); path_.push(w)
          dfs(w)
          path_.pop(); onPath.delete(w)
        }
      }
    }
    dfs(start)
    if (truncated) break
  }
  if (truncated) break
}

const rel = (i) => path.relative(repo, nodes[i])
console.log(`check-cycles: ${graph.size} modules, ${sccs.length} group(s) of modules in a cycle, ${cycles.length}${truncated ? '+' : ''} cycle(s)`)
if (cycles.length) {
  cycles.sort((a, b) => a.length - b.length || rel(a[0]).localeCompare(rel(b[0])))
  for (const c of cycles) console.log('Cycle: ' + c.map(rel).join(' -> '))
  if (truncated) console.log(`... stopped after ${MAX} cycles (--max)`)
  process.exit(1)
}
