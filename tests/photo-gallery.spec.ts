import { expect, test, type Locator, type Page } from '@playwright/test'

const galleryRegion = 'Gallery ảnh sinh nhật'

async function expectImageDecoded(image: Locator) {
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveAttribute('alt', /\S/)
  await expect.poll(() => image.evaluate((element: HTMLImageElement) =>
    element.complete && element.naturalWidth > 0 && element.naturalHeight > 0,
  )).toBe(true)
  await image.evaluate((element: HTMLImageElement) => element.decode())
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('.scene')
    return {
      document: document.documentElement.scrollWidth - window.innerWidth,
      scene: scene ? scene.scrollWidth - scene.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.scene).toBeLessThanOrEqual(1)
}

test('photo gallery opens directly and loads every photo', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/#gallery')
  await expect(page.getByRole('region', { name: galleryRegion })).toBeVisible()

  const cards = page.locator('button.memory-card')
  await expect(cards).toHaveCount(8)
  const sources = new Set<string>()
  for (const card of await cards.all()) {
    const image = card.getByRole('img')
    await expectImageDecoded(image)
    sources.add(await image.evaluate((element: HTMLImageElement) => element.currentSrc))
  }
  expect(sources.size).toBe(8)
  await expectNoHorizontalOverflow(page)

  await page.locator('.scene').evaluate((element) => element.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('photo-gallery.png') })
  expect(errors).toEqual([])
})

test('photo viewer changes images with controls and keyboard, then restores focus', async ({ page }, testInfo) => {
  await page.goto('/#gallery')
  const cards = page.locator('button.memory-card')
  await expect(cards).toHaveCount(8)
  const firstImage = await cards.nth(0).getByRole('img').getAttribute('src')
  const secondImage = await cards.nth(1).getByRole('img').getAttribute('src')
  expect(firstImage).toBeTruthy()
  expect(secondImage).toBeTruthy()

  await cards.first().click()
  const viewer = page.getByRole('dialog', { name: 'Xem ảnh kỷ niệm' })
  const photo = viewer.getByRole('img').first()
  await expect(viewer).toBeVisible()
  await expect(photo).toHaveAttribute('src', firstImage!)
  await expectImageDecoded(photo)

  await viewer.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click()
  await expect(photo).toHaveAttribute('src', secondImage!)
  await viewer.getByRole('button', { name: 'Ảnh trước', exact: true }).click()
  await expect(photo).toHaveAttribute('src', firstImage!)
  await page.keyboard.press('ArrowRight')
  await expect(photo).toHaveAttribute('src', secondImage!)
  await page.keyboard.press('ArrowLeft')
  await expect(photo).toHaveAttribute('src', firstImage!)

  const bounds = await viewer.boundingBox()
  const viewport = page.viewportSize()!
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('photo-viewer.png') })

  await page.keyboard.press('Escape')
  await expect(viewer).not.toBeVisible()
  await expect(cards.first()).toBeFocused()

  await cards.nth(1).click()
  await expect(viewer).toBeVisible()
  await viewer.getByRole('button', { name: 'Đóng ảnh', exact: true }).click()
  await expect(viewer).not.toBeVisible()
  await expect(cards.nth(1)).toBeFocused()
})

test('photo viewer wraps through all photos and downloads the displayed photo', async ({ page, isMobile }) => {
  await page.goto('/#gallery')
  const cards = page.locator('button.memory-card')
  await expect(cards).toHaveCount(8)
  const firstImage = await cards.first().getByRole('img').getAttribute('src')
  const secondImage = await cards.nth(1).getByRole('img').getAttribute('src')
  const lastImage = await cards.last().getByRole('img').getAttribute('src')
  expect(firstImage).toBeTruthy()
  expect(secondImage).toBeTruthy()
  expect(lastImage).toBeTruthy()
  expect(firstImage).not.toBe(lastImage)

  await cards.first().click()
  const viewer = page.getByRole('dialog', { name: 'Xem ảnh kỷ niệm' })
  const photo = viewer.getByRole('img')
  await expect(photo).toHaveAttribute('src', firstImage!)
  await expect(viewer.getByText('1 / 8', { exact: true })).toBeVisible()

  await viewer.getByRole('button', { name: 'Ảnh trước', exact: true }).click()
  await expect(photo).toHaveAttribute('src', lastImage!)
  await expect(viewer.getByText('8 / 8', { exact: true })).toBeVisible()
  await viewer.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click()
  await expect(photo).toHaveAttribute('src', firstImage!)
  await expectImageDecoded(photo)

  const downloadPromise = page.waitForEvent('download')
  await viewer.getByRole('link', { name: 'Tải ảnh về', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('ky-niem-1.webp')
  expect(download.url()).toBe(new URL(firstImage!, page.url()).href)
  expect(await download.failure()).toBeNull()

  if (isMobile) {
    const bounds = await photo.boundingBox()
    expect(bounds).not.toBeNull()
    const startX = bounds!.x + bounds!.width * 0.75
    const endX = bounds!.x + bounds!.width * 0.25
    const y = bounds!.y + bounds!.height / 2
    const session = await page.context().newCDPSession(page)
    try {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x: startX, y, id: 1 }],
      })
      for (let step = 1; step <= 4; step += 1) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x: startX + (endX - startX) * step / 4, y, id: 1 }],
        })
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } finally {
      await session.detach()
    }
    await expect(photo).toHaveAttribute('src', secondImage!)
    await expect(viewer.getByText('2 / 8', { exact: true })).toBeVisible()
  }
})

test('header navigation remembers only visited destinations until reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const labels = ['Bất ngờ', 'Lời nhắn', 'Bó hoa', 'Bánh kem', 'Gallery ảnh']
  const navigation = page.locator('#birthday-navigation')
  const buttons = navigation.locator('button')
  const menu = page.getByRole('button', { name: 'Mở menu', exact: true })
  const mobileMenu = await menu.isVisible()

  async function expectDestinations(expected: string[]) {
    await expect(buttons).toHaveCount(expected.length)
    await expect(buttons).toHaveText(expected)
  }

  async function navigate(label: string) {
    if (mobileMenu) await menu.click()
    await navigation.getByRole('button', { name: label, exact: true }).click()
    if (mobileMenu) await expect(menu).toHaveAttribute('aria-expanded', 'false')
  }

  await expectDestinations(['Bất ngờ'])
  await navigate('Bất ngờ')
  await expect(page.getByRole('heading', { name: 'Choose Your Surprise' })).toBeVisible()
  await expectDestinations(['Bất ngờ'])
  await page.getByRole('button', { name: 'Xem bó hoa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Flowers for You' })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Bó hoa'])
  await page.getByRole('button', { name: 'Quay lại chọn bất ngờ', exact: true }).click()
  await expectDestinations(['Bất ngờ', 'Bó hoa'])
  await page.getByRole('button', { name: 'Mở lời nhắn', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mở lá thư', exact: true })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Lời nhắn', 'Bó hoa'])
  await page.getByRole('button', { name: 'Mở lá thư', exact: true }).click()
  await expect(page.locator('.letter-view')).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Lời nhắn', 'Bó hoa'])
  await page.getByRole('button', { name: 'Khép lá thư', exact: true }).click()
  await expectDestinations(['Bất ngờ', 'Lời nhắn', 'Bó hoa'])
  await navigate('Bất ngờ')
  await page.getByRole('button', { name: 'Xem bánh sinh nhật', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ước một điều', exact: true })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Lời nhắn', 'Bó hoa', 'Bánh kem'])
  await page.getByRole('button', { name: 'Ước một điều', exact: true }).click()
  await expectDestinations(['Bất ngờ', 'Lời nhắn', 'Bó hoa', 'Bánh kem'])
  await page.getByRole('button', { name: 'Mở hộp quà kỷ niệm', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Our Little Memories', exact: true })).toBeVisible()
  await expectDestinations(labels)
  await navigate('Gallery ảnh')
  await expect(page.getByRole('region', { name: galleryRegion })).toBeVisible()
  await expect(page).toHaveURL(/#gallery$/)
  await expect(navigation.locator('button[aria-current="page"]')).toHaveText('Gallery ảnh')
  await expectDestinations(labels)

  await page.reload()
  await expect(page.getByRole('region', { name: galleryRegion })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Gallery ảnh'])
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Happy Birthday', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Happy Birthday!', exact: true })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Gallery ảnh'])
  await page.reload()
  await expectDestinations(['Bất ngờ'])
  await page.evaluate(() => { window.location.hash = 'gallery' })
  await expect(page.getByRole('region', { name: galleryRegion })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Gallery ảnh'])
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Happy Birthday!', exact: true })).toBeVisible()
  await expectDestinations(['Bất ngờ', 'Gallery ảnh'])

  await page.reload()
  await expectDestinations(['Bất ngờ'])
  await page.getByRole('button', { name: 'Mở thiệp sinh nhật', exact: true }).click()
  await page.getByRole('button', { name: 'Xem bánh sinh nhật', exact: true }).click()
  await expectDestinations(['Bất ngờ', 'Bánh kem'])
})
