import { expect, test } from '@playwright/test'

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`mobile navigation focuses visited links with ${reducedMotion} motion`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile navigation focus coverage')
    await page.setViewportSize({ width: 320, height: 568 })
    await page.emulateMedia({ reducedMotion })
    await page.goto('/#gallery')

    const navigation = page.locator('#birthday-navigation')
    const links = navigation.locator('button')
    const toggle = page.locator('.nav-toggle')
    await expect(links).toHaveText(['Bất ngờ', 'Gallery ảnh'])

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(links.first()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(links.nth(1)).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(navigation).toBeHidden()
    await expect(toggle).toBeFocused()
  })
}
