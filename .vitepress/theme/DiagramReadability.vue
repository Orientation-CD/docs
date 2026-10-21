<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const { lang } = useData()
const route = useRoute()
let active = false
let observer: MutationObserver | undefined
let frame: number | undefined
let hintSequence = 0

function improveDiagrams() {
  const chinese = /^zh(?:-|$)/i.test(lang.value)
  const label = chinese ? '图表，可用左右方向键横向滚动' : 'Diagram, use the left and right arrow keys to scroll horizontally'
  const help = chinese ? '图表按原始字号显示。可左右滑动，或聚焦图表后用左右方向键查看完整链路。' : 'Diagrams keep their original text size. Scroll sideways, or focus the diagram and use the left and right arrow keys to follow the full chain.'

  // Search builds its own cached excerpts. Only enhance the visible document's
  // diagrams, never a search result or its temporary/detached render tree.
  for (const container of document.querySelectorAll<HTMLElement>('.VPDoc main .vp-doc .mermaid')) {
    const svg = container.querySelector<SVGSVGElement>('svg')
    const width = svg?.viewBox.baseVal.width
    if (!svg || !width || !Number.isFinite(width)) continue
    const naturalWidth = `${Math.ceil(width)}px`
    if (svg.style.width !== naturalWidth) svg.style.width = naturalWidth
    if (svg.style.maxWidth !== 'none') svg.style.maxWidth = 'none'
    if (svg.style.height !== 'auto') svg.style.height = 'auto'
    container.classList.add('diagram-scroll')
    container.setAttribute('role', 'region')
    container.setAttribute('tabindex', '0')
    container.setAttribute('aria-label', label)

    let hint = container.previousElementSibling as HTMLElement | null
    if (!hint?.classList.contains('diagram-scroll-hint')) {
      hint = document.createElement('p')
      hint.className = 'diagram-scroll-hint'
      hint.id = `diagram-scroll-hint-${++hintSequence}`
      container.insertAdjacentElement('beforebegin', hint)
    }
    if (hint.textContent !== help) hint.textContent = help
    const overflowing = container.scrollWidth > container.clientWidth + 1
    hint.hidden = !overflowing
    if (overflowing) container.setAttribute('aria-describedby', hint.id)
    else container.removeAttribute('aria-describedby')
  }
}

function schedule() {
  if (!active || frame !== undefined) return
  frame = window.requestAnimationFrame(() => {
    frame = undefined
    if (active) improveDiagrams()
  })
}

watch([() => route.path, lang], schedule, { flush: 'post' })
onMounted(() => {
  active = true
  observer = new MutationObserver(schedule)
  // Mermaid inserts SVG asynchronously and replaces it after theme changes.
  // Child-list observation handles those updates without observing our styles.
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', schedule)
  schedule()
})
onUnmounted(() => {
  active = false
  observer?.disconnect()
  window.removeEventListener('resize', schedule)
  if (frame !== undefined) window.cancelAnimationFrame(frame)
})
</script>

<template><span hidden aria-hidden="true" /></template>
