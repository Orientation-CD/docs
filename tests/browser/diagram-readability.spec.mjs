import { test, expect } from '@playwright/test'

for (const locale of ['', 'zh/']) {
  test(`${locale || 'en/'} diagrams retain readable text with accessible, contained scrolling`, async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${locale}reference/flows/design-job-lifecycle`)
    const region = page.locator('.VPDoc main .diagram-scroll').first()
    const hint = region.locator('xpath=preceding-sibling::p[1][contains(@class, "diagram-scroll-hint")]')
    const expectedLabel = locale ? '图表，可用左右方向键横向滚动' : 'Diagram, use the left and right arrow keys to scroll horizontally'
    await expect(region).toHaveAttribute('role', 'region')
    await expect(region).toHaveAttribute('tabindex', '0')
    await expect(region).toHaveAttribute('aria-label', expectedLabel)
    await expect(hint).toBeVisible()
    await expect(hint).toContainText(locale ? '原始字号' : 'original text size')

    const measure = () => region.evaluate(container => {
      const svg = container.querySelector('svg')
      const text = svg.querySelector('text')
      return {
        viewport: container.clientWidth,
        full: container.scrollWidth,
        rendered: svg.getBoundingClientRect().width,
        natural: svg.viewBox.baseVal.width,
        textScale: Math.abs(text?.getScreenCTM()?.a || 0),
        page: document.documentElement.scrollWidth,
        screen: window.innerWidth,
      }
    })
    await expect.poll(async () => (await measure()).full > (await measure()).viewport + 50).toBeTruthy()
    let dimensions = await measure()
    expect(Math.abs(dimensions.rendered - dimensions.natural)).toBeLessThan(2)
    expect(dimensions.textScale).toBeGreaterThanOrEqual(.99)
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.screen)
    await page.screenshot({ path: testInfo.outputPath('desktop-diagram.png'), fullPage: false })
    await region.focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)

    const lightSvg = await region.locator('svg').elementHandle()
    await page.locator('.VPNavBarAppearance button').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect.poll(() => lightSvg.evaluate(svg => svg.isConnected)).toBeFalsy()
    await expect(region.locator('svg')).toBeVisible()
    await expect.poll(async () => Math.abs((await measure()).rendered - (await measure()).natural)).toBeLessThan(2)
    expect((await measure()).textScale).toBeGreaterThanOrEqual(.99)
    expect(await region.locator('xpath=preceding-sibling::p[1][contains(@class, "diagram-scroll-hint")]').count()).toBe(1)

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(hint).toBeVisible()
    dimensions = await measure()
    expect(dimensions.full).toBeGreaterThan(dimensions.viewport + 50)
    expect(Math.abs(dimensions.rendered - dimensions.natural)).toBeLessThan(2)
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.screen)

    await expect.poll(() => page.locator('.VPSidebar').evaluate(node => node.getBoundingClientRect().right)).toBeLessThanOrEqual(0)
    await region.evaluate(node => window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 160))
    await page.screenshot({ path: testInfo.outputPath('mobile-diagram.png'), fullPage: false })
    // Use real sidebar and translation links so these are client-side updates.
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator(`.VPSidebar a[href="/docs/${locale}reference/flows/wechat-login-flow"]`).click()
    await expect(page).toHaveURL(new RegExp(`/docs/${locale}reference/flows/wechat-login-flow$`))
    await expect(region).toHaveAttribute('aria-label', expectedLabel)
    await expect(region.locator('svg')).toBeVisible()
    dimensions = await measure()
    expect(Math.abs(dimensions.rendered - dimensions.natural)).toBeLessThan(2)
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.screen)
    const alternate = locale ? '' : 'zh/'
    await page.locator('.VPNavBarTranslations').hover()
    await page.locator(`.VPNavBarTranslations a[href="/docs/${alternate}reference/flows/wechat-login-flow"]`).click()
    await expect(region).toHaveAttribute('aria-label', alternate ? '图表，可用左右方向键横向滚动' : 'Diagram, use the left and right arrow keys to scroll horizontally')
    await expect(region.locator('xpath=preceding-sibling::p[1][contains(@class, "diagram-scroll-hint")]')).toContainText(alternate ? '原始字号' : 'original text size')
    expect(errors).toEqual([])
  })
}
