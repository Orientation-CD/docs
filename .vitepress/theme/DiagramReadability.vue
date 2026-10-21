<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const { lang } = useData()
const route = useRoute()
type Mode = 'auto' | 'fit' | 'actual' | 'zoom'
type Controls = { fit: HTMLButtonElement, actual: HTMLButtonElement, out: HTMLButtonElement, scale: HTMLElement, into: HTMLButtonElement, expand?: HTMLButtonElement, close?: HTMLButtonElement }
type Diagram = { container: HTMLElement, svg: SVGSVGElement, width: number, height: number, mode: Mode, scale: number, toolbar: HTMLElement, controls: Controls, index: number }
type Expanded = { source: Diagram, dialog: HTMLDialogElement, viewport: HTMLElement, svg: SVGSVGElement, controls: Controls, title: HTMLElement, mode: Mode, scale: number, opener: HTMLButtonElement }
let active = false
let observer: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let observedMain: HTMLElement | null = null
let frame: number | undefined
let sequence = 0
let expanded: Expanded | undefined
const diagrams = new Map<HTMLElement, Diagram>()

function words() {
  return /^zh(?:-|$)/i.test(lang.value)
    ? { diagram: '图表', controls: '图表显示控制', fit: '适应宽度', actual: '原始大小', out: '缩小', into: '放大', expand: '全屏查看', close: '关闭', viewport: '图表，可用方向键滚动', expanded: '全屏图表，可用方向键滚动' }
    : { diagram: 'Diagram', controls: 'Diagram display controls', fit: 'Fit width', actual: 'Actual size', out: 'Zoom out', into: 'Zoom in', expand: 'Full screen', close: 'Close', viewport: 'Diagram, use the arrow keys to scroll', expanded: 'Expanded diagram, use the arrow keys to scroll' }
}

function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text
}

function button(action: () => void) {
  const element = document.createElement('button')
  element.type = 'button'
  element.addEventListener('click', action)
  return element
}

function makeControls(toolbar: HTMLElement, change: (mode: Mode, delta?: number) => void, finish: () => void, modal = false): Controls {
  toolbar.setAttribute('role', 'group')
  const fit = button(() => change('fit'))
  const actual = button(() => change('actual'))
  const out = button(() => change('zoom', -1))
  const scale = document.createElement('span')
  scale.className = 'diagram-scale'
  scale.setAttribute('aria-live', 'polite')
  scale.setAttribute('aria-atomic', 'true')
  const into = button(() => change('zoom', 1))
  const finishButton = button(finish)
  toolbar.append(fit, actual, out, scale, into, finishButton)
  const controls = { fit, actual, out, scale, into, ...(modal ? { close: finishButton } : { expand: finishButton }) }
  labelControls(toolbar, controls)
  return controls
}

function labelControls(toolbar: HTMLElement, controls: Controls) {
  const text = words()
  toolbar.setAttribute('aria-label', text.controls)
  for (const key of ['fit', 'actual', 'out', 'into', 'expand', 'close'] as const) {
    const element = controls[key]
    if (!element) continue
    setText(element, text[key])
    element.setAttribute('aria-label', text[key])
    element.title = text[key]
  }
}

function resolvedMode(mode: Mode) {
  return mode === 'auto' ? (window.matchMedia('(min-width: 960px)').matches ? 'fit' : 'actual') : mode
}

function availableWidth(viewport: HTMLElement) {
  const style = window.getComputedStyle(viewport)
  return Math.max(1, viewport.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0'))
}

function applyScale(target: Diagram | Expanded) {
  const modal = 'dialog' in target
  const source = modal ? target.source : target
  const viewport = modal ? target.viewport : target.container
  const mode = resolvedMode(target.mode)
  if (mode === 'fit') target.scale = Math.min(1, availableWidth(viewport) / source.width)
  if (mode === 'actual') target.scale = 1
  target.svg.style.width = `${source.width * target.scale}px`
  target.svg.style.height = source.height ? `${source.height * target.scale}px` : 'auto'
  target.svg.style.maxWidth = 'none'
  setText(target.controls.scale, `${Math.round(target.scale * 100)}%`)
  target.controls.fit.setAttribute('aria-pressed', String(mode === 'fit'))
  target.controls.actual.setAttribute('aria-pressed', String(mode === 'actual'))
  target.controls.out.disabled = target.scale <= .1
  target.controls.into.disabled = target.scale >= 3
  viewport.dataset.diagramMode = mode
}

function changeScale(target: Diagram | Expanded, mode: Mode, delta = 0) {
  target.mode = mode
  if (mode === 'zoom') target.scale = Math.min(3, Math.max(.1, Math.round(target.scale * 10) / 10 + delta * .1))
  applyScale(target)
  if (mode !== 'zoom') ('dialog' in target ? target.viewport : target.container).scrollLeft = 0
}

// Mermaid styles and markers refer to SVG IDs. A second copy must have its own
// IDs, including references in CSS, so opening it cannot affect the inline SVG.
function cloneDiagram(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const prefix = `diagram-expanded-${++sequence}-`
  const replacements = new Map<string, string>()
  const elements = [clone, ...clone.querySelectorAll<SVGElement>('*')]
  for (const element of elements) {
    if (element.id) replacements.set(element.id, prefix + element.id)
  }
  const replaceIds = (value: string) => {
    let result = value
    for (const [before, after] of [...replacements].sort((a, b) => b[0].length - a[0].length)) {
      const escaped = before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(`#${escaped}(?![\\w-])`, 'g'), `#${after}`)
    }
    return result
  }
  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      if (attribute.name === 'id') element.setAttribute('id', replacements.get(attribute.value) || attribute.value)
      else if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby') {
        element.setAttribute(attribute.name, attribute.value.split(/\s+/).map(id => replacements.get(id) || id).join(' '))
      } else {
        const value = replaceIds(attribute.value)
        if (value !== attribute.value) element.setAttribute(attribute.name, value)
      }
    }
    if (element.tagName.toLowerCase() === 'style') element.textContent = replaceIds(element.textContent || '')
  }
  return clone
}

function disposeExpanded(current: Expanded) {
  if (expanded !== current) return
  expanded = undefined
  resizeObserver?.unobserve(current.viewport)
  current.dialog.remove()
  document.body.classList.remove('diagram-modal-open')
  if (current.opener.isConnected) current.opener.focus({ preventScroll: true })
}

function closeExpanded() {
  const current = expanded
  if (!current) return
  if (current.dialog.open) current.dialog.close()
  disposeExpanded(current)
}

function openExpanded(source: Diagram) {
  closeExpanded()
  const dialog = document.createElement('dialog')
  dialog.className = 'diagram-dialog'
  const header = document.createElement('header')
  header.className = 'diagram-dialog-header'
  const title = document.createElement('h2')
  title.id = `diagram-dialog-title-${++sequence}`
  dialog.setAttribute('aria-labelledby', title.id)
  const toolbar = document.createElement('div')
  toolbar.className = 'diagram-dialog-toolbar'
  header.append(title, toolbar)
  const viewport = document.createElement('div')
  viewport.className = 'diagram-dialog-viewport'
  viewport.tabIndex = 0
  viewport.setAttribute('role', 'region')
  const svg = cloneDiagram(source.svg)
  viewport.append(svg)
  dialog.append(header, viewport)
  const controls = makeControls(toolbar, (mode, delta) => {
    if (expanded) changeScale(expanded, mode, delta)
  }, closeExpanded, true)
  const current: Expanded = { source, dialog, viewport, svg, controls, title, mode: 'fit', scale: 1, opener: source.controls.expand! }
  expanded = current
  dialog.addEventListener('close', () => disposeExpanded(current))
  document.body.append(dialog)
  document.body.classList.add('diagram-modal-open')
  labelExpanded(current)
  dialog.showModal()
  applyScale(current)
  resizeObserver?.observe(viewport)
  controls.close!.focus({ preventScroll: true })
}

function labelExpanded(current: Expanded) {
  const text = words()
  setText(current.title, `${text.diagram} ${current.source.index}`)
  current.viewport.setAttribute('aria-label', text.expanded)
  labelControls(current.dialog.querySelector<HTMLElement>('.diagram-dialog-toolbar')!, current.controls)
}

function improveDiagrams() {
  // Only the actual document is observed. Search creates detached/cached page
  // excerpts of its own; those should not receive duplicate controls or dialogs.
  const main = document.querySelector<HTMLElement>('.VPDoc main')
  if (main !== observedMain) {
    observer?.disconnect()
    observedMain = main
    if (main) observer?.observe(main, { childList: true, subtree: true })
  }
  for (const [container, state] of diagrams) {
    if (main?.contains(container)) continue
    if (expanded?.source === state) closeExpanded()
    resizeObserver?.unobserve(container)
    state.toolbar.remove()
    diagrams.delete(container)
  }
  const containers = main?.querySelectorAll<HTMLElement>('.vp-doc .mermaid') || []
  let index = 0
  for (const container of containers) {
    index++
    const svg = container.querySelector<SVGSVGElement>('svg')
    const width = svg?.viewBox.baseVal.width
    const height = svg?.viewBox.baseVal.height || 0
    if (!svg || !width || !Number.isFinite(width)) continue
    let state = diagrams.get(container)
    if (!state) {
      const toolbar = document.createElement('div')
      toolbar.className = 'diagram-toolbar'
      const controls = makeControls(toolbar, (mode, delta) => changeScale(state!, mode, delta), () => openExpanded(state!))
      state = { container, svg, width, height, mode: 'auto', scale: 1, toolbar, controls, index }
      diagrams.set(container, state)
      container.insertAdjacentElement('beforebegin', toolbar)
      container.classList.add('diagram-viewport', 'diagram-scroll')
      container.setAttribute('role', 'region')
      container.tabIndex = 0
      resizeObserver?.observe(container)
    }
    if (state.toolbar.nextElementSibling !== container) container.insertAdjacentElement('beforebegin', state.toolbar)
    const replaced = state.svg !== svg
    state.svg = svg
    state.width = width
    state.height = height
    state.index = index
    container.setAttribute('aria-label', words().viewport)
    labelControls(state.toolbar, state.controls)
    applyScale(state)
    if (expanded?.source === state) {
      if (replaced) {
        expanded.svg = cloneDiagram(svg)
        expanded.viewport.replaceChildren(expanded.svg)
      }
      labelExpanded(expanded)
      applyScale(expanded)
    }
  }
}

function schedule() {
  if (!active || frame !== undefined) return
  frame = window.requestAnimationFrame(() => {
    frame = undefined
    if (active) improveDiagrams()
  })
}

watch(() => route.path, () => { closeExpanded(); schedule() }, { flush: 'post' })
watch(lang, schedule, { flush: 'post' })
onMounted(() => {
  active = true
  observer = new MutationObserver(schedule)
  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const state = diagrams.get(entry.target as HTMLElement)
      if (state) applyScale(state)
      if (expanded?.viewport === entry.target) applyScale(expanded)
    }
  })
  window.addEventListener('resize', schedule)
  schedule()
})
onUnmounted(() => {
  active = false
  closeExpanded()
  observer?.disconnect()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', schedule)
  if (frame !== undefined) window.cancelAnimationFrame(frame)
  for (const state of diagrams.values()) state.toolbar.remove()
  diagrams.clear()
})
</script>

<template><span hidden aria-hidden="true" /></template>
