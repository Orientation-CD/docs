import { test, expect } from '@playwright/test'

for (const locale of ['', 'zh/']) {
  test(`${locale || 'en/'} connects SDK, quota and mini-program daily-report routes to their guides`, async ({ page }) => {
    await page.goto(`${locale}reference/integration-status`)
    const dailyCapability = page.getByRole('row').filter({ hasText: locale ? '企业日报' : 'Enterprise daily reports' })
    await expect(dailyCapability).toContainText(locale ? '九个日报接口均已接入小程序' : 'All nine member/owner routes have mini-program callers')
    const floorPlan = page.locator(`.vp-doc a[href="/docs/${locale}reference/flows/floor-plan-flow"]`).first()
    await floorPlan.click()
    await expect(page).toHaveURL(new RegExp(`/docs/${locale}reference/flows/floor-plan-flow$`))
    await expect(page.locator('.vp-doc')).toContainText('editor_context')
    await expect(page.locator('.vp-doc')).toContainText('SDK')

    await page.goto(`${locale}reference/rest-api`)
    const index = page.locator('.vp-doc table').last()
    const editor = index.locator('tbody tr').filter({ hasText: '/v1/floor-plan-editor/context' })
    await expect(editor).toHaveCount(1)
    await editor.locator(`a[href="/docs/${locale}reference/flows/floor-plan-flow#editor-context"]`).click()
    await expect(page.locator('#editor-context')).toBeVisible()
    await expect(page).toHaveURL(/floor-plan-flow#editor-context$/)

    await page.goto(`${locale}reference/rest-api`)
    const quota = index.locator('tbody tr').filter({ hasText: '/v1/workspaces/{workspace_id}/me/token-quota' })
    await expect(quota).toHaveCount(1)
    await quota.locator(`a[href="/docs/${locale}reference/flows/member-quota-flow#me-token-quota"]`).click()
    await expect(page).toHaveURL(/member-quota-flow#me-token-quota$/)
    await expect(page.locator('#me-token-quota')).toBeVisible()
    await expect(page.locator('.vp-doc')).toContainText('member_token_quotas.py')

    await page.goto(`${locale}reference/rest-api`)
    const daily = index.locator('tbody tr').filter({ hasText: '/v1/workspaces/{workspace_id}/daily-reports/me/status' })
    await expect(daily).toHaveCount(1)
    await daily.locator(`a[href="/docs/${locale}reference/flows/daily-report-flow#daily-report-status"]`).click()
    await expect(page.locator('#daily-report-status')).toBeVisible()
    await expect(page.locator('.vp-doc')).toContainText('membership_started_at')
    await expect(page.locator('.vp-doc a[href*="/src/services/dailyReportStatus.ts#L"]').first()).toBeVisible()
    await expect(page.locator('.mermaid svg').first()).toBeVisible({ timeout: 20_000 })
  })
}
