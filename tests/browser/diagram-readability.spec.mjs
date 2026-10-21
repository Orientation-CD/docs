import { test, expect } from '@playwright/test'

function dimensions(viewport) {
  return viewport.evaluate(container => {
    const svg = container.querySelector('svg')
    return {
      viewport: container.clientWidth,
      full: container.scrollWidth,
      rendered: svg?.getBoundingClientRect().width || 0,
      natural: svg?.viewBox.baseVal.width || 0,
      page: document.documentElement.scrollWidth,
      screen: window.innerWidth,
    }
  })
}

async function expectFit(viewport) {
  await expect(viewport.locator('svg')).toBeVisible()
  await expect.poll(async () => {
    const size = await dimensions(viewport)
    return size.rendered > 0 && size.rendered <= size.viewport + 2 && size.full <= size.viewport + 2
  }).toBeTruthy()
}

async function expectActual(viewport) {
  await expect.poll(async () => {
    const size = await dimensions(viewport)
    return size.natural > 0 && Math.abs(size.rendered - size.natural) < 2
  }).toBeTruthy()
}

for (const locale of ['', 'zh/']) {
  const words = locale
    ? { fit: '适应宽度', actual: '原始大小', out: '缩小', in: '放大', full: '全屏查看', close: '关闭' }
    : { fit: 'Fit width', actual: 'Actual size', out: 'Zoom out', in: 'Zoom in', full: 'Full screen', close: 'Close' }

  test(`${locale || 'en/'} diagrams adapt, zoom and provide an accessible full-screen view`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${locale}reference/flows/design-job-lifecycle`)
    const viewport = page.locator('.VPDoc main .diagram-viewport').first()
    const toolbar = page.locator('.VPDoc main .diagram-toolbar').first()
    const control = name => toolbar.getByRole('button', { name, exact: true })
    await expect(viewport).toHaveAttribute('role', 'region')
    await expect(viewport).toHaveAttribute('tabindex', '0')
    await expect(viewport).toHaveAccessibleName(/图表|Diagram/)
    await expect(toolbar.locator('.diagram-scale')).toHaveAttribute('aria-live', 'polite')
    await expectFit(viewport)
    let size = await dimensions(viewport)
    expect(size.rendered).toBeLessThan(size.natural - 50)

    // Fit follows the available desktop width without growing beyond natural size.
    const initialWidth = size.rendered
    await page.setViewportSize({ width: 1920, height: 1000 })
    await expectFit(viewport)
    await expect.poll(async () => (await dimensions(viewport)).rendered).toBeGreaterThan(initialWidth + 100)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await expectFit(viewport)

    // At narrow widths the default preserves readable text and contains panning.
    await page.setViewportSize({ width: 390, height: 844 })
    await expectActual(viewport)
    size = await dimensions(viewport)
    expect(size.full).toBeGreaterThan(size.viewport + 50)
    expect(size.page).toBeLessThanOrEqual(size.screen)
    await viewport.focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => viewport.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
    await page.screenshot({ path: testInfo.outputPath('mobile-readable-diagram.png'), fullPage: false })

    // Both the inline and expanded views offer a fit option on a phone.
    await control(words.fit).click()
    await expectFit(viewport)
    const opener = control(words.full)
    await opener.click()
    const dialog = page.locator('dialog.diagram-dialog')
    const expanded = dialog.locator('.diagram-dialog-viewport')
    await expect(dialog).toBeVisible()
    await expectFit(expanded)
    expect(await dialog.evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(350)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    await dialog.getByRole('button', { name: words.close, exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()

    // Explicit zoom remains stable across resize; fit is always one action away.
    await page.setViewportSize({ width: 1440, height: 1000 })
    await control(words.actual).click()
    await expectActual(viewport)
    await control(words.in).click()
    await expect.poll(async () => {
      const current = await dimensions(viewport)
      return current.rendered / current.natural
    }).toBeGreaterThan(1.05)
    const zoomedWidth = (await dimensions(viewport)).rendered
    await page.setViewportSize({ width: 1920, height: 1000 })
    await expect.poll(async () => Math.abs((await dimensions(viewport)).rendered - zoomedWidth)).toBeLessThan(2)
    await control(words.out).click()
    await expectActual(viewport)
    await control(words.fit).click()
    await expectFit(viewport)

    // A theme rerender should update, rather than duplicate, each viewer.
    const lightSvg = await viewport.locator('svg').elementHandle()
    await page.locator('.VPNavBarAppearance button').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect.poll(() => lightSvg.evaluate(svg => svg.isConnected)).toBeFalsy()
    await expectFit(viewport)
    expect(await page.locator('.VPDoc main .diagram-toolbar').count()).toBe(await page.locator('.VPDoc main .diagram-viewport').count())

    await opener.click()
    await expect(dialog).toBeVisible()
    await expectFit(expanded)
    expect(await dialog.evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(1800)
    // Native modal focus stays inside the viewer in either tab direction.
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBeTruthy()
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBeTruthy()
    await dialog.getByRole('button', { name: words.actual, exact: true }).click()
    await expectActual(expanded)
    await dialog.getByRole('button', { name: words.fit, exact: true }).click()
    await expectFit(expanded)
    await page.screenshot({ path: testInfo.outputPath('desktop-expanded-diagram.png'), fullPage: false })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()

    // Client-side navigation and language switching must not leave stale controls.
    await page.locator(`.VPSidebar a[href="/docs/${locale}reference/flows/wechat-login-flow"]`).click()
    await expect(page).toHaveURL(new RegExp(`/docs/${locale}reference/flows/wechat-login-flow$`))
    await expect(viewport.locator('svg')).toBeVisible()
    await expectFit(viewport)
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await control(words.full).click()
    await expect(dialog).toBeVisible()
    // Back is a real client-side route change even while the document is inert.
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/docs/${locale}reference/flows/design-job-lifecycle$`))
    await expect(page.locator('dialog.diagram-dialog')).toHaveCount(0)
    await expect(page.locator('body')).not.toHaveClass(/diagram-modal-open/)
    await expectFit(viewport)
    await page.locator(`.VPSidebar a[href="/docs/${locale}reference/flows/wechat-login-flow"]`).click()
    await expect(page).toHaveURL(new RegExp(`/docs/${locale}reference/flows/wechat-login-flow$`))
    await expectFit(viewport)
    const alternate = locale ? '' : 'zh/'
    await page.locator('.VPNavBarTranslations').hover()
    await page.locator(`.VPNavBarTranslations a[href="/docs/${alternate}reference/flows/wechat-login-flow"]`).click()
    await expect(viewport.locator('svg')).toBeVisible()
    await expect(toolbar.getByRole('button', { name: alternate ? '适应宽度' : 'Fit width', exact: true })).toBeVisible()
    await expectFit(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    expect(errors).toEqual([])
  })
}
