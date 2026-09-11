import { expect, test, type Page } from '@playwright/test'

async function settleScene(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const animations = document.getAnimations().filter(
      (animation) => animation.effect?.getComputedTiming().iterations !== Infinity,
    )
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
  })
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
  await expect(page.locator('.letter-salutation')).toBeVisible()
  await settleScene(page)
  await page.screenshot({ path: testInfo.outputPath('04-letter.png') })

  await page.getByRole('button', { name: 'Khép lá thư' }).click()
  await page.getByRole('button', { name: 'Quay lại chọn bất ngờ' }).click()
  await page.getByRole('button', { name: 'Xem bó hoa' }).click()
  await expect(page.getByRole('heading', { name: 'Flowers for You' })).toBeVisible()
  await expect(page.locator('.wish-note')).toHaveCount(4)
  await expect(page.locator('.wish-note__paper')).toHaveCount(4)
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

  expect(consoleErrors).toEqual([])
})

test('flower notes use illustrated paper and respect motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở thiệp sinh nhật' }).click()
  await page.getByRole('button', { name: 'Xem bó hoa' }).click()

  const notes = page.locator('.wish-note')
  const paperImages = page.locator('.wish-note__paper')
  await expect(notes).toHaveCount(4)
  await expect(paperImages).toHaveCount(4)

  const paperStates = await paperImages.evaluateAll((images: HTMLImageElement[]) =>
    images.map((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      src: image.currentSrc || image.src,
    })),
  )
  expect(paperStates.every(({ complete, naturalWidth, naturalHeight }) =>
    complete && naturalWidth > 0 && naturalHeight > 0,
  )).toBe(true)
  expect(new Set(paperStates.map(({ src }) => src)).size).toBe(1)

  const motion = await notes.first().evaluate((note) => {
    const revealStyle = getComputedStyle(note)
    const card = note.querySelector<HTMLElement>('.wish-note__card')
    const floatStyle = card ? getComputedStyle(card) : null
    return {
      revealName: revealStyle.animationName,
      revealDuration: Number.parseFloat(revealStyle.animationDuration),
      floatName: floatStyle?.animationName ?? '',
      floatIterations: floatStyle?.animationIterationCount ?? '',
    }
  })
  expect(motion.revealName).toContain('noteScatterIn')
  expect(motion.revealDuration).toBeGreaterThanOrEqual(0.8)
  expect(motion.floatName).toContain('noteFloat')
  expect(motion.floatIterations).toBe('infinite')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() => notes.first().evaluate((note) => getComputedStyle(note).animationName))
    .toBe('none')
  await expect
    .poll(() => notes.first().locator('.wish-note__card').evaluate((card) => getComputedStyle(card).animationName))
    .toBe('none')
})

test('letter appears only after the envelope opens', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở thiệp sinh nhật' }).click()
  await page.getByRole('button', { name: 'Mở lời nhắn' }).click()

  const openButton = page.getByRole('button', { name: 'Mở lá thư' })
  await openButton.click()

  await expect(openButton).toBeDisabled()
  await expect(openButton).toHaveClass(/is-opening/)
  await expect(page.locator('.letter-view')).toHaveCount(0)
  await expect(page.locator('.letter-salutation')).toBeVisible({ timeout: 2500 })
})

test('wish papers rise before they fall', async ({ page }, testInfo) => {
  const initialTime = new Date('2026-08-25T00:00:00Z')
  await page.clock.install({ time: initialTime })
  const wishButton = await openCake(page)
  await page.clock.pauseAt(new Date(initialTime.getTime() + 60_000))
  await wishButton.click()

  const papers = page.locator('.confetti i')
  const giftButton = page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })
  await expect(papers).toHaveCount(78)
  await expect(giftButton).toHaveCount(0)

  // Sample the actual CSS animation at fixed times so screenshot latency
  // cannot let the four-second gift timer remove the confetti mid-check.
  const sampleAnimation = async (time: number) => {
    const count = await papers.evaluateAll((elements, currentTime) => {
      const animations = elements.flatMap((element) => element.getAnimations())
      animations.forEach((animation) => {
        animation.pause()
        animation.currentTime = currentTime
      })
      return animations.length
    }, time)
    expect(count).toBe(78)
  }
  await sampleAnimation(780)
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

  await sampleAnimation(2080)
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
  await expect(page.getByRole('group', { name: 'Điều khiển album' })).toBeVisible()
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

test('reselecting the active cake view keeps the pending gift timer alive', async ({ page }) => {
  const initialTime = new Date('2026-08-25T00:00:00Z')
  await page.clock.install({ time: initialTime })
  const wishButton = await openCake(page)
  await page.clock.pauseAt(new Date(initialTime.getTime() + 60_000))

  await wishButton.click()
  const mobileMenuButton = page.getByRole('button', { name: 'Mở menu' })
  if (await mobileMenuButton.isVisible()) await mobileMenuButton.click()
  await page.locator('#birthday-navigation button[aria-current="page"]').click()

  await page.clock.runFor(4000)
  await expect(page.getByRole('button', { name: 'Mở hộp quà kỷ niệm' })).toBeVisible()
  await expect(page.locator('.confetti i')).toHaveCount(0)
})

test('initial keyboard focus starts with the header controls', async ({ page }) => {
  await page.goto('/')

  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY')
  await page.keyboard.press('Tab')
  await expect(page.locator('.brand')).toBeFocused()
})

test('birthday card has no background music or audio control', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: /nhạc nền/i })).toHaveCount(0)
  await expect(page.locator('audio, video')).toHaveCount(0)
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

  expect(totalPages).toBe(8)
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

test('mobile navigation returns to visited destinations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only navigation coverage')

  await page.goto('/')
  const menuButton = page.getByRole('button', { name: 'Mở menu' })
  await menuButton.click()
  await expect(page.getByRole('navigation', { name: 'Điều hướng thiệp' })).toHaveClass(/nav--open/)

  await page.getByRole('button', { name: 'Bất ngờ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Surprise' })).toBeVisible()
  await page.getByRole('button', { name: 'Xem bó hoa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Flowers for You' })).toBeVisible()
  await menuButton.click()
  await page.getByRole('button', { name: 'Bất ngờ', exact: true }).click()
  await page.getByRole('button', { name: 'Xem bánh sinh nhật', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ước một điều', exact: true })).toBeVisible()
  await menuButton.click()
  await page.getByRole('button', { name: 'Bó hoa' }).click()
  await expect(page.getByRole('heading', { name: 'Flowers for You' })).toBeVisible()

  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('button', { name: 'Bánh kem' }).click()
  await expect(page.getByRole('heading', { name: 'Happy Birthday!' })).toBeVisible()
})
