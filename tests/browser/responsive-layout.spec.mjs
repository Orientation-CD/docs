import { test, expect } from '@playwright/test'

test('reading layout uses desktop space while containing mobile content', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('zh/reference/system-walkthrough')
  const diagram = page.locator('.VPDoc main .diagram-viewport').first()
  await expect(diagram.locator('svg')).toBeVisible({ timeout: 20_000 })

  for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: width < 960 ? 844 : 1200 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    await expect.poll(() => diagram.evaluate((node, narrow) => {
      const svg = node.querySelector('svg')
      return narrow
        ? Math.abs(svg.getBoundingClientRect().width - svg.viewBox.baseVal.width) < 2
        : node.scrollWidth <= node.clientWidth + 2
    }, width < 960)).toBeTruthy()
    if (width < 960) await expect.poll(() => page.locator('.VPSidebar').evaluate(node => node.getBoundingClientRect().right)).toBeLessThanOrEqual(0)
    else await expect.poll(() => page.locator('.VPSidebar').evaluate(node => node.getBoundingClientRect().left)).toBeGreaterThanOrEqual(-1)
    if (width === 1440) {
      const outline = page.locator('.VPLocalNavOutlineDropdown')
      await outline.getByRole('button').click()
      const firstJourney = outline.locator('a[href="#first-journey"]')
      await expect(firstJourney).toBeVisible()
      await firstJourney.click()
      await expect(page).toHaveURL(/#first-journey$/)
      await expect(outline.locator('.items')).not.toBeVisible()
    }
    const metrics = await page.evaluate(() => {
      const box = selector => {
        const node = document.querySelector(selector)
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        return { left: rect.left, right: rect.right, width: rect.width, display: style.display, visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 }
      }
      const diagram = document.querySelector('.VPDoc main .diagram-viewport')
      return {
        screen: innerWidth,
        body: document.documentElement.scrollWidth,
        content: box('.VPDoc .content-container'),
        paragraph: box('.VPDoc main .vp-doc > div > p'),
        sidebar: box('.VPSidebar'),
        aside: box('.VPDoc .aside'),
        diagram: box('.VPDoc main .diagram-viewport'),
        nav: box('.VPNavBar .container'),
        diagramScroll: diagram.scrollWidth - diagram.clientWidth,
        toolbarOverflow: document.querySelector('.diagram-toolbar').scrollWidth - document.querySelector('.diagram-toolbar').clientWidth,
      }
    })
    expect(metrics.body, `${width}px page width`).toBeLessThanOrEqual(width)
    expect(metrics.content.left, `${width}px content left`).toBeGreaterThanOrEqual(0)
    expect(metrics.content.right, `${width}px content right`).toBeLessThanOrEqual(width)
    expect(metrics.diagram.left).toBeGreaterThanOrEqual(metrics.content.left - 2)
    expect(metrics.diagram.right).toBeLessThanOrEqual(metrics.content.right + 2)
    expect(metrics.nav.left).toBeGreaterThanOrEqual(-1)
    expect(metrics.nav.right).toBeLessThanOrEqual(width + 1)
    expect(metrics.toolbarOverflow, `${width}px controls wrap within the diagram`).toBeLessThanOrEqual(2)

    if (width < 960) {
      expect(metrics.sidebar.right).toBeLessThanOrEqual(0)
      expect(metrics.aside.visible).toBeFalsy()
      expect(metrics.content.width).toBeGreaterThan(width - 90)
    } else {
      expect(metrics.sidebar.width).toBeGreaterThanOrEqual(250)
      expect(metrics.sidebar.width).toBeLessThanOrEqual(300)
      expect(metrics.sidebar.left).toBeGreaterThanOrEqual(-1)
      expect(metrics.content.left).toBeGreaterThanOrEqual(metrics.sidebar.right)
      expect(metrics.diagramScroll, `${width}px default diagram fit`).toBeLessThanOrEqual(2)
    }

    if (width < 1280) await expect(page.locator('.VPNavBarHamburger')).toBeVisible()
    else await expect(page.locator('.VPNavBarHamburger')).not.toBeVisible()

    if (width >= 1600) {
      expect(metrics.aside.visible).toBeTruthy()
      expect(metrics.aside.width).toBeGreaterThanOrEqual(200)
      expect(metrics.content.right).toBeLessThanOrEqual(metrics.aside.left + 1)
      expect(metrics.aside.right).toBeLessThanOrEqual(width)
    } else {
      expect(metrics.aside.visible).toBeFalsy()
    }

    // Prose stays at a readable line length, while diagrams use the wider column.
    if (width >= 1440) {
      const minimumContent = width === 1440 ? 1000 : width === 1920 ? 1250 : 1850
      expect(metrics.content.width).toBeGreaterThan(minimumContent)
      expect(metrics.paragraph.width).toBeLessThan(1000)
      expect(metrics.diagram.width).toBeGreaterThan(metrics.paragraph.width + 100)
    }
    if (width === 390 || width === 2560) {
      await diagram.scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath(`walkthrough-${width}.png`), fullPage: false })
    }
  }

  // The longer English navigation must also collapse cleanly on tablets/laptops.
  await page.goto('reference/system-walkthrough')
  await expect(diagram.locator('svg')).toBeVisible()
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    const menu = page.locator('.VPNavBarHamburger')
    await expect(menu).toBeVisible()
    await menu.click()
    await expect(page.locator('.VPNavScreen')).toBeVisible()
    const nav = page.locator('.VPNavScreen a[href="/docs/reference/system-walkthrough"]')
    await expect(nav).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    await menu.click()
    await expect(page.locator('.VPNavScreen')).not.toBeVisible()
  }
  expect(errors).toEqual([])
})
