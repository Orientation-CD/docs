import { test, expect } from '@playwright/test'

const cases = [
  { prefix: '', title: 'Workflows', queries: ['workflow', 'PowerPoint', '/v1/workflows', 'PROJECT_OUTCOMES_ENABLED'] },
  { prefix: 'zh/', title: '工作流', queries: ['工作流', '设计报告', '文案', '抖音支付', '/v1/workflows', 'PROJECT_OUTCOMES_ENABLED'] },
]
for (const { prefix, title, queries } of cases) {
  test(`${prefix || 'en/'} search, keyboard, results and deep-link reload`, async ({ page }) => {
    const failures = []
    page.on('pageerror', error => failures.push(error.message))
    page.on('console', message => { if (message.type() === 'error') failures.push(message.text()) })
    page.on('response', response => { if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:4173/')) failures.push(`${response.status()} ${response.url()}`) })
    await page.goto(`${prefix}backend/workflows`)
    await expect(page.locator('h1')).toContainText(title)
    await expect(page.locator('.VPSidebar')).toBeVisible()
    await page.locator('.DocSearch-Button').click()
    const input = page.locator('#localsearch-input')
    for (const query of queries) {
      await input.fill(query)
      await expect(page.locator('.VPLocalSearchBox .result').first()).toBeVisible()
      await expect(page.locator('.VPLocalSearchBox .results')).toContainText(query, { ignoreCase: true })
      const hrefs = await page.locator('.VPLocalSearchBox .result').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
      expect(hrefs.every(href => href.startsWith(`/docs/${prefix}`) && (prefix || !href.startsWith('/docs/zh/')))).toBeTruthy()
    }
    await input.fill('zzzznotaword123456789')
    await expect(page.locator('.VPLocalSearchBox .result')).toHaveCount(0)
    await expect(page.locator('.VPLocalSearchBox')).toContainText(prefix ? '没有找到结果' : 'No results')
    await page.keyboard.press('Escape')
    await expect(input).not.toBeVisible()
    await page.keyboard.press('Control+k')
    await expect(input).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Meta+k')
    await expect(input).toBeVisible()
    await input.fill(queries[0])
    await expect(page.locator('.VPLocalSearchBox .result').first()).toBeVisible()
    await page.keyboard.press('ArrowDown')
    const href = await page.locator('.VPLocalSearchBox .result.selected').getAttribute('href')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new URL(href, 'http://127.0.0.1:4173').href)
    await expect(input).not.toBeVisible()
    await page.reload()
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('.VPSidebar')).toBeVisible()
    expect(failures).toEqual([])
  })

  test(`${prefix || 'en/'} language switch preserves topic`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${prefix}frontend/overview`)
    const switcher = page.locator('.VPNavBarTranslations')
    await switcher.hover()
    const counterpart = prefix ? '/docs/frontend/overview' : '/docs/zh/frontend/overview'
    await switcher.locator(`a[href="${counterpart}"]`).click()
    await expect(page).toHaveURL(new RegExp(counterpart + '$'))
    await expect(page.locator('.VPSidebar')).toBeVisible()
  })

  test(`${prefix || 'en/'} mobile menu and search`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${prefix}frontend/overview`)
    await page.locator('.VPNavBarHamburger').click()
    await expect(page.locator('.VPNavScreen')).toBeVisible()
    await page.locator('.VPNavScreen a').filter({ hasText: prefix ? '入门' : 'Get started' }).first().click()
    await expect(page).toHaveURL(new RegExp(`/docs/${prefix}get-started/introduction$`))
    await page.locator('.DocSearch-Button').click()
    await page.locator('#localsearch-input').fill(prefix ? '项目' : 'project')
    await expect(page.locator('.VPLocalSearchBox .result').first()).toBeVisible()
    await page.locator('.VPLocalSearchBox .result').first().click()
    await expect(page.locator('.VPLocalSearchBox')).not.toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  })

  test(`${prefix || 'en/'} diagrams and theme switching`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${prefix}reference/flows/design-job-lifecycle`)
    await expect(page.locator('.mermaid svg').first()).toBeVisible({ timeout: 20_000 })
    await page.locator('.VPNavBarAppearance button').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('.mermaid svg').first()).toBeVisible()
    await page.locator('.VPNavBarAppearance button').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.locator('.mermaid svg').first()).toBeVisible()
    expect(errors).toEqual([])
  })

  test(`${prefix || 'en/'} detailed search safely extracts diagram pages`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${prefix}frontend/overview`)
    await page.locator('.DocSearch-Button').click()
    await page.locator('#localsearch-input').fill(prefix ? 'Workflow 准入' : 'Workflow admission workers durable settlement')
    const result = page.locator('.VPLocalSearchBox .result[href*="reference/flows/design-job-lifecycle"]').first()
    await expect(result).toBeVisible()
    await expect(result.locator('.excerpt')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test(`${prefix || 'en/'} missing page provides a working recovery link`, async ({ page }) => {
    await page.goto(`${prefix}this-page-does-not-exist`)
    await expect(page.locator('.NotFound')).toBeVisible()
    const home = page.locator('.NotFound a')
    await expect(home).toHaveAttribute('href', `/docs/${prefix}`)
    if (prefix) await expect(page.locator('.NotFound')).toContainText('页面未找到')
    await home.click()
    await expect(page.locator('.VPHome')).toBeVisible()
  })

}
