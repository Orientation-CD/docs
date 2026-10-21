import { test, expect } from '@playwright/test'

for (const prefix of ['', 'zh/']) {
  test(`${prefix || 'en/'} API index opens its full source-reading chain`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${prefix}reference/rest-api`)
    const table = page.locator('.vp-doc table').last()
    const rows = table.locator('tbody tr')
    await expect(rows).toHaveCount(112)
    for (const row of await rows.all()) {
      await expect(row.locator('a[href*="github.com"]').first()).toHaveAttribute('href', /\/blob\/[a-f0-9]{40}\/.*#L\d+$/)
      await expect(row.locator(`a[href^="/docs/${prefix}reference/"]`)).toHaveAttribute('href', /#[a-z0-9-]+$/)
    }
    const submit = rows.filter({ hasText: 'POST' }).filter({ has: page.getByText('/v1/workflows', { exact: true }) })
    await submit.locator(`a[href^="/docs/${prefix}reference/"]`).click()
    await expect(page).toHaveURL(new RegExp(`/docs/${prefix}reference/flows/design-job-lifecycle#submit-workflow$`))
    await expect(page.locator('#submit-workflow')).toBeVisible()
    await expect(page.locator('.vp-doc')).toContainText('admit_workflow_job')
    await expect(page.locator('.mermaid svg').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.VPSidebar')).toContainText(prefix ? '执行与产物' : 'Execution and results')
    const source = page.locator('.vp-doc a[href*="workflow_admission.py#L"]').first()
    await expect(source).toHaveAttribute('href', /b13cc5668920620a274cb91a3393ed9fadac72ae/)
    expect(errors).toEqual([])
  })
}
