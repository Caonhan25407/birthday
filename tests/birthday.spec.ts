import { expect, test, type Page } from '@playwright/test'

async function settleScene(page: Page) {
  await page.waitForTimeout(1000)
  const horizontalOverflow = await page.locator('.scene').evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  )
  expect(horizontalOverflow).toBeLessThanOrEqual(1)
}

async function openCake(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở thiệp sinh nhật' }).click()
  await page.getByRole('button', { name: 'Xem bánh sinh nhật' }).click()

  const wishButton = page.getByRole('button', { name: 'Ước một điều' })
  await expect(wishButton).toBeVisible()
  return wishButton
}

async function openGallery(page: Page, reducedMotion = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const wishButton = await openCake(page)
  await wishButton.click()

  const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
  await expect(giftButton).toBeVisible()
  await giftButton.click()
  await expect(page.getByRole('heading', { name: 'Our Little Memories' })).toBeVisible()

  if (!reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(
      await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(false)
  }
}

async function turnGalleryPage(page: Page, action: () => Promise<void>) {
  const album = page.locator('.gallery-album')
  const turningPage = page.locator('.gallery-photo-page--turning')

  await action()
  await expect(turningPage).toHaveCount(1)
  await expect(album).toHaveAttribute('aria-busy', 'true')
  await expect
    .poll(() => turningPage.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe('none')
  await expect(turningPage).toHaveCount(0, { timeout: 2500 })
  await expect(album).toHaveAttribute('aria-busy', 'false')
}

async function expectCurrentGalleryImageLoaded(page: Page, pageNumber: number) {
  const photoPages = page.locator('.gallery-photo-sheet')
  await expect(photoPages).toHaveCount(1)
  await expect(photoPages).toHaveAttribute('data-gallery-page', String(pageNumber))

  const image = photoPages.locator('.gallery-photo')
  await expect(image).toHaveAttribute('alt', /\S/)
  const imageState = await image.evaluate((element: HTMLImageElement) => ({
    complete: element.complete,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    src: element.currentSrc || element.src,
  }))
  expect(imageState.complete).toBe(true)
  expect(imageState.naturalWidth).toBeGreaterThan(0)
  expect(imageState.naturalHeight).toBeGreaterThan(0)
  return imageState.src
}

test('birthday card completes every interactive scene', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Happy Birthday!' })).toBeVisible()
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('01-intro.png') })

  await page.getByRole('button', { name: 'Mở thiệp sinh nhật' }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Surprise' })).toBeVisible()
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('02-menu.png') })

  await page.getByRole('button', { name: 'Mở lời nhắn' }).click()
  await expect(page.getByRole('button', { name: 'Mở lá thư' })).toBeVisible()
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('03-envelope.png') })

  await page.getByRole('button', { name: 'Mở lá thư' }).click()
  await expect(page.getByText('Người thương à,')).toBeVisible()
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('04-letter.png') })

  await page.getByRole('button', { name: 'Khép lá thư' }).click()
  await page.getByRole('button', { name: 'Quay lại chọn bất ngờ' }).click()
  await page.getByRole('button', { name: 'Xem bó hoa' }).click()
  await expect(page.getByRole('heading', { name: 'Flowers for You' })).toBeVisible()
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('05-flowers.png') })

  await page.getByRole('button', { name: 'Quay lại chọn bất ngờ' }).click()
  await page.getByRole('button', { name: 'Xem bánh sinh nhật' }).click()
  await expect(page.getByRole('button', { name: 'Ước một điều' })).toBeVisible()
  await settleScene(page)
  await page.getByRole('button', { name: 'Ước một điều' }).click()
  await expect(page.getByRole('button', { name: 'Điều ước đã được gửi' })).toBeDisabled()
  await expect(page.locator('.confetti i')).toHaveCount(78)
  await page.screenshot({ path: testInfo.outputPath('06-cake.png') })

  const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
  const galleryHeading = page.getByRole('heading', { name: 'Our Little Memories' })
  await expect(giftButton).toBeVisible({ timeout: 6000 })
  await expect(page.locator('.confetti i')).toHaveCount(0)
  await expect(galleryHeading).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('07-cake-gift.png') })

  await giftButton.click()
  await expect(galleryHeading).toBeVisible()
  await expect(page.locator('#birthday-navigation button[aria-current="page"]')).toHaveText(
    'Bánh kem',
  )
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('08-gallery.png') })

  const musicButton = page.getByRole('button', { name: 'Nhạc nền' })
  await musicButton.click()
  await expect(musicButton).toHaveAttribute('aria-pressed', 'true')
  await musicButton.click()
  await expect(musicButton).toHaveAttribute('aria-pressed', 'false')

  expect(consoleErrors).toEqual([])
})

test('letter appears only after the envelope opens', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở thiệp sinh nhật' }).click()
  await page.getByRole('button', { name: 'Mở lời nhắn' }).click()

  const openButton = page.getByRole('button', { name: 'Mở lá thư' })
  await openButton.click()

  await expect(openButton).toBeDisabled()
  await expect(openButton).toHaveClass(/is-opening/)
  await expect(page.locator('.letter-view')).toHaveCount(0)

  await page.waitForTimeout(260)
  await page.screenshot({ path: testInfo.outputPath('envelope-flap-opening.png') })

  await page.waitForTimeout(460)
  await expect(page.locator('.message-letter-preview')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('envelope-opening.png') })

  await expect(page.getByText('Người thương à,')).toBeVisible()
})

test('wish papers rise before they fall', async ({ page }, testInfo) => {
  const wishButton = await openCake(page)
  await wishButton.click()

  const papers = page.locator('.confetti i')
  const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
  await expect(papers).toHaveCount(78)
  await expect(giftButton).toHaveCount(0)

  await page.waitForTimeout(780)
  const risingCount = await papers.evaluateAll((elements) => {
    const container = elements[0]?.parentElement?.getBoundingClientRect()
    if (!container) return 0
    return elements.filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.bottom > container.top && rect.top < container.top + container.height * 0.34
    }).length
  })
  expect(risingCount).toBeGreaterThan(10)
  await page.screenshot({ path: testInfo.outputPath('wish-papers-rising.png') })

  await page.waitForTimeout(1300)
  const fallingCount = await papers.evaluateAll((elements) => {
    const container = elements[0]?.parentElement?.getBoundingClientRect()
    if (!container) return 0
    return elements.filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.top > container.top + container.height * 0.62 && rect.top < container.bottom
    }).length
  })
  expect(fallingCount).toBeGreaterThan(10)
  await expect(giftButton).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('wish-papers-falling.png') })
})

test('gift appears after four seconds and only opens the gallery when clicked', async ({ page }) => {
  const initialTime = new Date('2026-08-25T00:00:00Z')
  await page.clock.install({ time: initialTime })
  const wishButton = await openCake(page)
  await page.clock.pauseAt(new Date(initialTime.getTime() + 60_000))

  const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
  const galleryHeading = page.getByRole('heading', { name: 'Our Little Memories' })
  await wishButton.click()

  await page.clock.runFor(3999)
  await expect(giftButton).toHaveCount(0)
  await expect(galleryHeading).toHaveCount(0)

  await page.clock.runFor(1)
  await expect(giftButton).toBeVisible()
  await expect(page.locator('.confetti i')).toHaveCount(0)
  await expect(galleryHeading).toHaveCount(0)

  await page.clock.runFor(10_000)
  await expect(galleryHeading).toHaveCount(0)

  await giftButton.click()
  await expect(galleryHeading).toBeVisible()
})

test('reduced motion reveals the gift immediately without confetti', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const wishButton = await openCake(page)
  const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
  const galleryHeading = page.getByRole('heading', { name: 'Our Little Memories' })

  await wishButton.click()

  await expect(giftButton).toBeVisible()
  await expect(page.locator('.confetti i')).toHaveCount(0)
  await expect(galleryHeading).toHaveCount(0)

  await giftButton.click()
  await expect(galleryHeading).toBeVisible()
})

test('leaving the cake cancels the pending gift timer', async ({ page }) => {
  const initialTime = new Date('2026-08-25T00:00:00Z')
  await page.clock.install({ time: initialTime })
  const wishButton = await openCake(page)
  await page.clock.pauseAt(new Date(initialTime.getTime() + 60_000))

  await wishButton.click()
  await expect(page.locator('.confetti i')).toHaveCount(78)
  await page.getByRole('button', { name: 'Quay lại chọn bất ngờ' }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Surprise' })).toBeVisible()

  await page.clock.runFor(5000)
  await expect(page.getByRole('heading', { name: 'Choose Your Surprise' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Our Little Memories' })).toHaveCount(0)
})

test('gallery turns through every loaded photo with page, controls, and keyboard', async ({ page }) => {
  await openGallery(page)

  const album = page.locator('.gallery-album')
  const progress = page.locator('.gallery-progress__count')
  const progressDots = page.locator('.gallery-progress__dots i')
  const pageTrigger = page.locator('.gallery-page-trigger')
  const previousButton = page.getByRole('button', { name: 'Xem ảnh trước' })
  const nextButton = page.getByRole('button', { name: 'Xem ảnh tiếp theo' })
  const imageSources = new Set<string>()
  const totalPages = await progressDots.count()

  expect(totalPages).toBeGreaterThan(1)
  await expect(progress).toHaveText(`1 / ${totalPages}`)
  await expect(previousButton).toBeDisabled()
  await expect(nextButton).toBeEnabled()
  await expect(pageTrigger).toHaveAttribute('aria-disabled', 'false')
  imageSources.add(await expectCurrentGalleryImageLoaded(page, 1))

  await turnGalleryPage(page, () => pageTrigger.click())
  await expect(progress).toHaveText(`2 / ${totalPages}`)
  imageSources.add(await expectCurrentGalleryImageLoaded(page, 2))

  await turnGalleryPage(page, () => nextButton.click())
  await expect(progress).toHaveText(`3 / ${totalPages}`)
  imageSources.add(await expectCurrentGalleryImageLoaded(page, 3))

  for (let pageNumber = 4; pageNumber <= totalPages; pageNumber += 1) {
    await album.focus()
    await turnGalleryPage(page, () => page.keyboard.press('ArrowRight'))
    await expect(progress).toHaveText(`${pageNumber} / ${totalPages}`)
    imageSources.add(await expectCurrentGalleryImageLoaded(page, pageNumber))
  }

  expect(imageSources.size).toBe(totalPages)
  await expect(nextButton).toBeDisabled()
  await expect(pageTrigger).toHaveAttribute('aria-disabled', 'true')
  await album.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.gallery-photo-page--turning')).toHaveCount(0)
  await expect(progress).toHaveText(`${totalPages} / ${totalPages}`)

  await turnGalleryPage(page, () => previousButton.click())
  await expect(progress).toHaveText(`${totalPages - 1} / ${totalPages}`)

  await album.focus()
  await turnGalleryPage(page, () => page.keyboard.press('ArrowLeft'))
  await expect(progress).toHaveText(`${totalPages - 2} / ${totalPages}`)
})

test('rapid gallery page clicks advance only one photo', async ({ page }) => {
  await openGallery(page)

  const pageTrigger = page.locator('.gallery-page-trigger')
  const turningPage = page.locator('.gallery-photo-page--turning')
  const progress = page.locator('.gallery-progress__count')
  const totalPages = await page.locator('.gallery-progress__dots i').count()

  await pageTrigger.evaluate((element: HTMLButtonElement) => {
    for (let clickIndex = 0; clickIndex < 10; clickIndex += 1) element.click()
  })

  await expect(turningPage).toHaveCount(1)
  await expect(page.locator('.gallery-album')).toHaveAttribute('aria-busy', 'true')

  await pageTrigger.evaluate((element: HTMLButtonElement) => {
    for (let clickIndex = 0; clickIndex < 10; clickIndex += 1) element.click()
  })

  await expect(turningPage).toHaveCount(0, { timeout: 2500 })
  await expect(progress).toHaveText(`2 / ${totalPages}`)
  await expectCurrentGalleryImageLoaded(page, 2)
})

test('reduced motion changes gallery pages immediately without a flip layer', async ({ page }) => {
  await openGallery(page, true)

  const album = page.locator('.gallery-album')
  const progress = page.locator('.gallery-progress__count')
  const pageTrigger = page.locator('.gallery-page-trigger')
  const turningPage = page.locator('.gallery-photo-page--turning')
  const totalPages = await page.locator('.gallery-progress__dots i').count()

  await expect(progress).toHaveText(`1 / ${totalPages}`)
  await pageTrigger.click()
  await expect(progress).toHaveText(`2 / ${totalPages}`)
  await expect(turningPage).toHaveCount(0)
  await expect(album).toHaveAttribute('aria-busy', 'false')

  await page.getByRole('button', { name: 'Xem ảnh tiếp theo' }).click()
  await expect(progress).toHaveText(`3 / ${totalPages}`)
  await expect(turningPage).toHaveCount(0)

  await album.focus()
  for (let pageNumber = 4; pageNumber <= totalPages; pageNumber += 1) {
    await page.keyboard.press('ArrowRight')
    await expect(progress).toHaveText(`${pageNumber} / ${totalPages}`)
    await expect(turningPage).toHaveCount(0)
  }
  await expect(page.getByRole('button', { name: 'Xem ảnh tiếp theo' })).toBeDisabled()

  await page.keyboard.press('ArrowLeft')
  await expect(progress).toHaveText(`${totalPages - 1} / ${totalPages}`)
  await expect(turningPage).toHaveCount(0)
})

test('mobile navigation opens and reaches every destination', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only navigation coverage')

  await page.goto('/')
  const menuButton = page.getByRole('button', { name: 'Mở menu' })
  await menuButton.click()
  await expect(page.getByRole('navigation', { name: 'Điều hướng thiệp' })).toHaveClass(/nav--open/)

  await page.getByRole('button', { name: 'Bó hoa' }).click()
  await expect(page.getByRole('heading', { name: 'Flowers for You' })).toBeVisible()

  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('button', { name: 'Bánh kem' }).click()
  await expect(page.getByRole('heading', { name: 'Happy Birthday!' })).toBeVisible()
})
