import { expect, test, type Page, type TestInfo } from '@playwright/test'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'breakpoint', width: 760, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile-landscape', width: 844, height: 390 },
  { name: 'mobile-landscape-small', width: 568, height: 320 },
]

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.locator('img').evaluateAll(async (images) => {
    const visibleImages = images.filter((image) => image.getClientRects().length > 0)
    await Promise.all(
      visibleImages.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          })
        }
        if (image.naturalWidth > 0) await image.decode().catch(() => undefined)
      }),
    )
  })
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const animations = document.getAnimations().filter(
      (animation) => animation.effect?.getComputedTiming().iterations !== Infinity,
    )
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
  })
}

async function auditScene(page: Page, viewportName: string, sceneName: string, testInfo: TestInfo) {
  await settle(page)

  const issues = await page.evaluate(() => {
    const problems: string[] = []
    const scene = document.querySelector<HTMLElement>('.scene')
    const frame = document.querySelector<HTMLElement>('.page-frame')
    if (!scene || !frame) return ['Missing .scene or .page-frame']

    if (scene.scrollWidth - scene.clientWidth > 1) {
      problems.push(`Scene overflows horizontally by ${scene.scrollWidth - scene.clientWidth}px`)
    }

    const frameRect = frame.getBoundingClientRect()
    if (frameRect.left < -1 || frameRect.right > window.innerWidth + 1) {
      problems.push(`Page frame exceeds viewport horizontally: ${frameRect.left}..${frameRect.right}`)
    }
    if (frameRect.top < -1 || frameRect.bottom > window.innerHeight + 1) {
      problems.push(`Page frame exceeds viewport vertically: ${frameRect.top}..${frameRect.bottom}`)
    }

    const introEnvelope = scene.querySelector('.envelope-trigger')
    if (introEnvelope) {
      const envelopeRect = introEnvelope.getBoundingClientRect()
      scene.querySelectorAll('.intro-title__first, .intro-title__last, .intro-dedication, .intro-signature').forEach((element) => {
        const range = document.createRange()
        range.selectNodeContents(element)
        const rect = range.getBoundingClientRect()
        if (rect.left < envelopeRect.right && rect.right > envelopeRect.left &&
            rect.top < envelopeRect.bottom && rect.bottom > envelopeRect.top) {
          problems.push(`Envelope covers intro text: ${element.textContent}`)
        }
      })
    }

    document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
      if (image.getClientRects().length === 0) return
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        problems.push(`Broken image: ${image.className || image.alt || image.src}`)
      }
    })

    document.querySelectorAll<HTMLElement>('.surprise-choice').forEach((choice, index) => {
      const image = choice.querySelector<HTMLElement>('img')
      const label = choice.querySelector<HTMLElement>('.surprise-choice__label')
      const subtitle = choice.querySelector<HTMLElement>('.surprise-choice__sub')
      if (!image || !label || !subtitle) return

      const imageRect = image.getBoundingClientRect()
      const artRect = choice.querySelector<HTMLElement>('.surprise-choice__art')?.getBoundingClientRect()
      const labelRect = label.getBoundingClientRect()
      const subtitleRect = subtitle.getBoundingClientRect()
      const visibleImageBottom = artRect ? Math.min(imageRect.bottom, artRect.bottom) : imageRect.bottom
      const imageAndLabelShareColumns =
        imageRect.left < labelRect.right && imageRect.right > labelRect.left
      if (imageAndLabelShareColumns && visibleImageBottom > labelRect.top + 1) {
        problems.push(`Surprise ${index + 1} image overlaps its label by ${visibleImageBottom - labelRect.top}px`)
      }
      if (labelRect.bottom > subtitleRect.top + 1) {
        problems.push(`Surprise ${index + 1} label overlaps its subtitle`)
      }
    })

    document.querySelectorAll<HTMLElement>('button').forEach((button) => {
      const style = getComputedStyle(button)
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return
      const name = button.getAttribute('aria-label')?.trim() || button.innerText.trim()
      if (!name) problems.push(`Button has no accessible name: ${button.className}`)
      const rect = button.getBoundingClientRect()
      const minimumTarget = window.innerWidth <= 760 ? 44 : 24
      if (rect.width < minimumTarget || rect.height < minimumTarget) {
        problems.push(
          `Button target is below ${minimumTarget}px: ${button.className} (${rect.width}x${rect.height})`,
        )
      }
    })

    const cakeCollage = document.querySelector<HTMLElement>('.cake-collage')
    const cakeImage = document.querySelector<HTMLElement>('.cake-collage__image')
    if (cakeCollage && cakeImage) {
      const collageRect = cakeCollage.getBoundingClientRect()
      const imageRect = cakeImage.getBoundingClientRect()
      if (
        imageRect.left < collageRect.left - 1 ||
        imageRect.right > collageRect.right + 1 ||
        imageRect.top < collageRect.top - 1 ||
        imageRect.bottom > collageRect.bottom + 1
      ) {
        problems.push('Cake image exceeds its collage container')
      }
    }

    const textSelector = [
      'h1:not(.sr-only)',
      'h2',
      'p:not(.sr-only)',
      '.brand span',
      '.nav button span',
      '.surprise-choice__label',
      '.surprise-choice__sub',
      '.wish-button',
      '.gallery-gift span',
      'figcaption',
      '.gallery-stamp',
    ].join(',')

    document.querySelectorAll<HTMLElement>(textSelector).forEach((element) => {
      const style = getComputedStyle(element)
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0 ||
        element.closest('.tooltip')
      ) {
        return
      }

      if (element.getClientRects().length === 0) return

      const text = element.innerText.trim()
      if (!text) return
      const rect = element.getBoundingClientRect()
      const sceneRect = scene.getBoundingClientRect()

      if (rect.width <= 0 || rect.height <= 0) problems.push(`Text has zero size: "${text}"`)
      if (rect.left < sceneRect.left - 2 || rect.right > sceneRect.right + 2) {
        problems.push(`Text exceeds scene horizontally: "${text}" (${rect.left}..${rect.right})`)
      }
      if (style.overflowX !== 'visible' && element.scrollWidth - element.clientWidth > 1) {
        problems.push(`Text clips horizontally: "${text}"`)
      }
      if (style.overflowY !== 'visible' && element.scrollHeight - element.clientHeight > 1) {
        problems.push(`Text clips vertically: "${text}"`)
      }
    })

    const visibleText = document.body.innerText
    for (const marker of ['Ã', 'Â', 'Ä', 'Æ', '�']) {
      if (visibleText.includes(marker)) problems.push(`Possible encoding artifact: ${marker}`)
    }

    return problems
  })

  const scene = page.locator('.scene')
  await scene.evaluate((element) => element.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath(`${viewportName}-${sceneName}-top.png`) })

  const canScroll = await scene.evaluate((element) => element.scrollHeight - element.clientHeight > 8)
  if (canScroll) {
    await scene.evaluate((element) => element.scrollTo(0, element.scrollHeight))
    await page.waitForTimeout(50)
    await page.screenshot({ path: testInfo.outputPath(`${viewportName}-${sceneName}-bottom.png`) })
    await scene.evaluate((element) => element.scrollTo(0, 0))
  }

  return issues.map((issue) => `${viewportName}/${sceneName}: ${issue}`)
}

test.beforeEach(({ page: _page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chrome',
    'This suite supplies its own desktop, tablet, and mobile viewport matrix.',
  )
})

test('all layouts, elements, and text remain healthy', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })

  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  const layoutIssues: string[] = []

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:1ms!important;}',
    })

    layoutIssues.push(...(await auditScene(page, viewport.name, 'intro', testInfo)))

    await page.locator('.envelope-trigger').click()
    layoutIssues.push(...(await auditScene(page, viewport.name, 'menu', testInfo)))

    await page.locator('.surprise-choice--message').click()
    layoutIssues.push(...(await auditScene(page, viewport.name, 'message-envelope', testInfo)))

    await page.locator('.open-letter-button').click()
    layoutIssues.push(...(await auditScene(page, viewport.name, 'message-letter', testInfo)))

    await page.locator('.back-button').click()
    await page.locator('.back-button').click()
    await page.locator('.surprise-choice').nth(1).click()
    layoutIssues.push(...(await auditScene(page, viewport.name, 'flowers', testInfo)))

    await page.locator('.back-button').click()
    await page.locator('.surprise-choice').nth(2).click()
    layoutIssues.push(...(await auditScene(page, viewport.name, 'cake', testInfo)))

    await page.locator('.wish-button').click()

    const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
    await expect(giftButton).toBeVisible()
    layoutIssues.push(...(await auditScene(page, viewport.name, 'cake-gift', testInfo)))

    await giftButton.click()
    await expect(page.getByRole('heading', { name: 'Our Little Memories' })).toBeVisible()
    const progress = page.locator('.gallery-progress__count')
    const nextButton = page.getByRole('button', { name: 'Xem ảnh tiếp theo' })
    const galleryPageCount = await page.locator('.gallery-progress__dots i').count()

    for (let galleryPage = 1; galleryPage <= galleryPageCount; galleryPage += 1) {
      await expect(progress).toHaveText(`${galleryPage} / ${galleryPageCount}`)
      layoutIssues.push(
        ...(await auditScene(page, viewport.name, `gallery-page-${galleryPage}`, testInfo)),
      )
      if (galleryPage < galleryPageCount) await nextButton.click()
    }
  }

  expect(layoutIssues, layoutIssues.join('\n')).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('mobile navigation manages visibility, focus, and current page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')

  const navigation = page.locator('#birthday-navigation')
  const toggle = page.locator('.nav-toggle')

  await expect(navigation).toHaveCSS('visibility', 'hidden')
  await toggle.click()
  await expect(navigation).toHaveCSS('visibility', 'visible')
  await expect(navigation.locator('button').first()).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(navigation).toHaveCSS('visibility', 'hidden')
  await toggle.click()
  await expect(navigation).toHaveCSS('visibility', 'visible')
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(navigation).toHaveCSS('visibility', 'hidden')
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await toggle.click()
  await expect(navigation.locator('button').first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(navigation).toHaveCSS('visibility', 'hidden')
})

test('new scenes start at the top after navigating from scrolled content', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const scene = page.locator('.scene')
  await page.locator('.envelope-trigger').click()
  await page.locator('.surprise-choice').nth(1).click()
  await expect(page.locator('.flowers-heading')).toBeVisible()
  await scene.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  expect(await scene.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  await page.locator('.back-button').click()
  await expect(page.locator('.menu-view')).toBeVisible()
  await expect.poll(() => scene.evaluate((element) => element.scrollTop)).toBe(0)

  const sceneTop = await scene.evaluate((element) => element.getBoundingClientRect().top)
  const headingTop = await page.locator('.menu-view .section-heading').evaluate((element) => element.getBoundingClientRect().top)
  expect(headingTop).toBeGreaterThanOrEqual(sceneTop)
})
