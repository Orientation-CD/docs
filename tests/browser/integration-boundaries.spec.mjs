import { test, expect } from '@playwright/test'

for (const locale of ['', 'zh/']) {
  test(`${locale || 'en/'} distinguishes candidate features and opens the quota chain`, async ({ page }) => {
    await page.goto(`${locale}reference/integration-status`)
    const floorPlan = page.locator(`.vp-doc a[href="/docs/${locale}frontend/floor-plans"]`).first()
    await floorPlan.click()
    await expect(page).toHaveURL(new RegExp(`/docs/${locale}frontend/floor-plans$`))
    await expect(page.locator('.vp-doc')).toContainText(locale ? '候选' : 'candidate', { ignoreCase: true })
    await expect(page.locator('.vp-doc')).toContainText('main')

    await page.goto(`${locale}reference/rest-api`)
    const index = page.locator('.vp-doc table').last()
    await expect(index).not.toContainText('/v1/floor-plan-')
    const quota = index.locator('tbody tr').filter({ hasText: '/v1/workspaces/{workspace_id}/me/token-quota' })
    await expect(quota).toHaveCount(1)
    await quota.locator(`a[href="/docs/${locale}reference/flows/member-quota-flow#me-token-quota"]`).click()
    await expect(page).toHaveURL(/member-quota-flow#me-token-quota$/)
    await expect(page.locator('#me-token-quota')).toBeVisible()
    await expect(page.locator('.vp-doc')).toContainText('member_token_quotas.py')
  })
}
