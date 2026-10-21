import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import DiagramReadability from './DiagramReadability.vue'
import './style.css'
import './responsive.css'
import './diagrams.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-bottom': () => h(DiagramReadability),
  }),
}
