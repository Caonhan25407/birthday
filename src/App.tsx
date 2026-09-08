import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowLeft,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Heart,
  Images,
  Mail,
  Menu,
  Sparkles,
  X,
} from 'lucide-react'
import bouquetImage from './assets/bouquet.webp'
import cakeImage from './assets/cake.webp'
import cakeCollageImage from './assets/cake-collage.webp'
import flowerNoteImage from './assets/flower-note.webp'
import galleryImage01 from './assets/pic/01.webp'
import galleryImage02 from './assets/pic/02.webp'
import galleryImage03 from './assets/pic/03.webp'
import galleryImage04 from './assets/pic/04.webp'
import galleryImage05 from './assets/pic/05.webp'
import galleryImage06 from './assets/pic/06.webp'
import galleryImage07 from './assets/pic/07.webp'
import galleryImage08 from './assets/pic/08.webp'
import introBunnyPlushImage from './assets/intro-bunny-plush-cutout.webp'
import introBunnyWhiteImage from './assets/intro-bunny-white-cutout.webp'
import introGiftImage from './assets/intro-gift-cutout.webp'
import introLoveImage from './assets/intro-love-cutout.webp'
import introPeoniesImage from './assets/intro-peonies-cutout.webp'
import introRosesKraftImage from './assets/intro-roses-kraft-cutout.webp'
import introRosesWhiteImage from './assets/intro-roses-white-cutout.webp'
import introTulipEnvelopeImage from './assets/intro-tulip-envelope-cutout.webp'
import messageEnvelopeImage from './assets/message-envelope.webp'
import './App.css'

type View =
  | 'intro'
  | 'menu'
  | 'message-envelope'
  | 'message-letter'
  | 'flowers'
  | 'cake'
  | 'gallery'

const viewLabels: Record<View, string> = {
  intro: 'Chúc mừng sinh nhật',
  menu: 'Chọn bất ngờ',
  'message-envelope': 'Lời nhắn',
  'message-letter': 'Lá thư sinh nhật',
  flowers: 'Bó hoa',
  cake: 'Bánh sinh nhật',
  gallery: 'Thư viện ảnh',
}

const navItems: Array<{ label: string; view: View; icon: typeof Mail }> = [
  { label: 'Bất ngờ', view: 'menu', icon: Sparkles },
  { label: 'Lời nhắn', view: 'message-envelope', icon: Mail },
  { label: 'Bó hoa', view: 'flowers', icon: Flower2 },
  { label: 'Bánh kem', view: 'cake', icon: CakeSlice },
]

const flowerNotes = [
  'Một bó hoa dành cho người đáng yêu nhất.',
  'Mong mỗi ngày của bạn đều nở rộ niềm vui.',
  'Dành cho người mình luôn trân quý.',
  'Bạn xứng đáng với mọi điều dịu dàng trên đời.',
]

const galleryNote = {
  title: 'Gửi bạn của hôm nay,',
  text: 'Mong bạn luôn giữ được nét hồn nhiên ấy, và mỗi tuổi mới đều có thêm thật nhiều niềm vui.',
}

const galleryMemories = [
  {
    src: galleryImage01,
    alt: 'Ảnh kỷ niệm 1 của người nhận thiệp',
    caption: 'Ngày ấy, bé xíu và thật đáng yêu.',
  },
  {
    src: galleryImage02,
    alt: 'Ảnh kỷ niệm 2 của người nhận thiệp',
    caption: 'Lớn thêm một chút, vẫn nguyên nét hồn nhiên.',
  },
  {
    src: galleryImage03,
    alt: 'Ảnh kỷ niệm 3 của người nhận thiệp',
    caption: 'Nụ cười này, mình luôn muốn ngắm nhìn.',
  },
  {
    src: galleryImage04,
    alt: 'Ảnh kỷ niệm 4 của người nhận thiệp',
    caption: 'Một chút tinh nghịch của hôm nay.',
  },
  {
    src: galleryImage05,
    alt: 'Ảnh kỷ niệm 5 của người nhận thiệp',
    caption: 'Một ngày nắng đẹp và một dáng pose thật xinh.',
  },
  {
    src: galleryImage06,
    alt: 'Ảnh kỷ niệm 6 của người nhận thiệp',
    caption: 'Một chút tập trung, một chút đáng yêu.',
  },
  {
    src: galleryImage07,
    alt: 'Ảnh kỷ niệm 7 của người nhận thiệp',
    caption: 'Một khoảnh khắc bên nhau thật dịu dàng.',
  },
  {
    src: galleryImage08,
    alt: 'Ảnh kỷ niệm 8 của người nhận thiệp',
    caption: 'Những ngày cùng nhau luôn thật đáng nhớ.',
  },
] as const

type GalleryFlip = {
  direction: 'next' | 'previous'
  target: number
}

const WISH_TO_GIFT_DELAY_MS = 4000

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function preloadImage(src: string) {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  void image.decode().catch(() => undefined)
}

const confetti = Array.from({ length: 78 }, (_, index) => {
  const direction = index % 2 === 0 ? -1 : 1
  const fallX = direction * (8 + ((index * 17) % 54))

  return {
    '--start-x': `${48 + ((index * 13) % 5)}%`,
    '--start-y': `${43 + ((index * 11) % 6)}%`,
    '--burst-x': `${direction * (12 + ((index * 29) % 42))}vw`,
    '--peak-y': `${-(20 + ((index * 23) % 38))}vh`,
    '--drift-x': `${fallX + ((index * 7) % 23) - 11}vw`,
    '--fall-mid-x': `${fallX + ((index * 19) % 19) - 9}vw`,
    '--fall-x': `${fallX}vw`,
    '--fall-y': `${60 + ((index * 31) % 32)}vh`,
    '--delay': `${(index % 14) * 22}ms`,
    '--duration': `${2.8 + (index % 7) * 0.14}s`,
    '--spin-up': `${direction * (150 + ((index * 47) % 480))}deg`,
    '--spin-mid': `${-direction * (260 + ((index * 61) % 620))}deg`,
    '--spin-down': `${direction * (720 + ((index * 79) % 1080))}deg`,
    '--paper-width': `${6 + (index % 5)}px`,
    '--paper-height': `${10 + ((index * 3) % 9)}px`,
    '--paper-radius': index % 4 === 0 ? '50%' : index % 3 === 0 ? '0' : '2px',
    '--color': ['#7b1229', '#ef8daa', '#f7c85c', '#a79bc6', '#f8eee2', '#d84d73'][
      index % 6
    ],
  }
})

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="back-button" type="button" onClick={onClick} aria-label={label}>
      <ArrowLeft size={21} />
      <span className="tooltip">{label}</span>
    </button>
  )
}

function GalleryPhotoPage({ pageIndex }: { pageIndex: number }) {
  const memory = galleryMemories[pageIndex]

  return (
    <div className="gallery-photo-sheet" data-gallery-page={pageIndex + 1}>
      <figure className="gallery-polaroid">
        <img
          className="gallery-photo"
          src={memory.src}
          alt={memory.alt}
          decoding="async"
          fetchPriority="high"
        />
        <figcaption className="gallery-caption">
          {memory.caption}
          <Heart size={14} fill="currentColor" aria-hidden="true" />
        </figcaption>
      </figure>
      <span className="gallery-sheet-number" aria-hidden="true">
        {String(pageIndex + 1).padStart(2, '0')}
      </span>
    </div>
  )
}

function App() {
  const [view, setView] = useState<View>('intro')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [wishMade, setWishMade] = useState(false)
  const [giftRevealed, setGiftRevealed] = useState(false)
  const [wishEffectId, setWishEffectId] = useState(0)
  const [galleryPage, setGalleryPage] = useState(0)
  const [galleryFlip, setGalleryFlip] = useState<GalleryFlip | null>(null)
  const [isLetterOpening, setIsLetterOpening] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const navToggleRef = useRef<HTMLButtonElement>(null)
  const previousViewRef = useRef<View>(view)
  const wishTimerRef = useRef<number | null>(null)

  const clearWishTimer = () => {
    if (wishTimerRef.current === null) return
    window.clearTimeout(wishTimerRef.current)
    wishTimerRef.current = null
  }

  const goTo = (nextView: View) => {
    const isSameView = nextView === view

    setMobileNavOpen(false)
    if (isSameView) {
      window.requestAnimationFrame(() => {
        mainRef.current?.scrollTo(0, 0)
        mainRef.current?.focus({ preventScroll: true })
      })
      return
    }

    clearWishTimer()
    setIsLetterOpening(false)
    setView(nextView)
    setGalleryFlip(null)
    if (nextView === 'gallery') setGalleryPage(0)
    if (nextView !== 'cake') {
      setWishMade(false)
      setGiftRevealed(false)
    }

  }

  const openLetter = () => {
    if (isLetterOpening) return

    if (prefersReducedMotion()) {
      goTo('message-letter')
      return
    }

    setIsLetterOpening(true)
  }

  const makeWish = () => {
    if (wishMade || wishTimerRef.current !== null) return

    setWishMade(true)
    setGiftRevealed(false)

    if (prefersReducedMotion()) {
      setGiftRevealed(true)
      return
    }

    setWishEffectId((current) => current + 1)
    wishTimerRef.current = window.setTimeout(() => {
      wishTimerRef.current = null
      setGiftRevealed(true)
    }, WISH_TO_GIFT_DELAY_MS)
  }

  const changeGalleryPage = (direction: GalleryFlip['direction']) => {
    if (galleryFlip) return

    const target = galleryPage + (direction === 'next' ? 1 : -1)
    if (target < 0 || target >= galleryMemories.length) return

    if (prefersReducedMotion()) {
      setGalleryPage(target)
      return
    }

    setGalleryFlip({ direction, target })
  }

  const finishGalleryFlip = () => {
    if (!galleryFlip) return
    setGalleryPage(galleryFlip.target)
    setGalleryFlip(null)
  }

  const toggleMobileNav = () => {
    const willOpen = !mobileNavOpen
    setMobileNavOpen(willOpen)
    if (willOpen) {
      window.requestAnimationFrame(() => navRef.current?.querySelector('button')?.focus())
    }
  }

  useEffect(() => {
    document.title = `${viewLabels[view]} | Birthday Card`
    const viewChanged = previousViewRef.current !== view
    previousViewRef.current = view
    if (!viewChanged) return

    mainRef.current?.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [view])

  useEffect(() => {
    if (view !== 'gallery') return

    const nextMemory = galleryMemories[galleryPage + 1]
    if (nextMemory) preloadImage(nextMemory.src)
  }, [galleryPage, view])

  useEffect(() => {
    if (giftRevealed) preloadImage(galleryMemories[0].src)
  }, [giftRevealed])

  useEffect(
    () => () => {
      if (wishTimerRef.current !== null) window.clearTimeout(wishTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!mobileNavOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileNavOpen(false)
      window.requestAnimationFrame(() => navToggleRef.current?.focus())
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileNavOpen])

  const back = () => {
    if (view === 'gallery') goTo('cake')
    else if (view === 'message-letter') goTo('message-envelope')
    else if (view === 'menu') goTo('intro')
    else goTo('menu')
  }

  const isNavActive = (target: View) => {
    if (target === 'message-envelope') return view.startsWith('message')
    if (target === 'cake') return view === 'cake' || view === 'gallery'
    return view === target
  }

  const galleryPageOnTop =
    galleryFlip?.direction === 'previous' ? galleryFlip.target : galleryPage
  const galleryPageUnderneath =
    galleryFlip?.direction === 'next' ? galleryFlip.target : galleryPage

  return (
    <div className="page-frame">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('intro')}>
          <Heart size={14} fill="currentColor" />
          <span lang="en">Happy Birthday</span>
        </button>

        <nav
          id="birthday-navigation"
          ref={navRef}
          className={`nav ${mobileNavOpen ? 'nav--open' : ''}`}
          aria-label="Điều hướng thiệp"
          onBlur={(event) => {
            if (!mobileNavOpen) return
            const nextTarget = event.relatedTarget
            if (
              nextTarget instanceof Node &&
              (event.currentTarget.contains(nextTarget) || navToggleRef.current?.contains(nextTarget))
            ) {
              return
            }
            setMobileNavOpen(false)
          }}
        >
          {navItems.map(({ label, view: itemView, icon: Icon }) => (
            <button
              className={isNavActive(itemView) ? 'is-active' : ''}
              type="button"
              onClick={() => goTo(itemView)}
              aria-current={isNavActive(itemView) ? 'page' : undefined}
              key={itemView}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="topbar__actions">
          <button
            ref={navToggleRef}
            className="icon-button nav-toggle"
            type="button"
            onClick={toggleMobileNav}
            aria-label={mobileNavOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="birthday-navigation"
          >
            {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      <main
        ref={mainRef}
        className={`scene scene--${view}`}
        tabIndex={-1}
        aria-label={viewLabels[view]}
      >
        {view === 'intro' && (
          <section className="intro-view scene-enter">
            <div className="intro-decorations" aria-hidden="true">
              <img
                className="intro-decoration intro-decoration--roses-white"
                src={introRosesWhiteImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--peonies"
                src={introPeoniesImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--roses-kraft"
                src={introRosesKraftImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--gift"
                src={introGiftImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--bunny-white"
                src={introBunnyWhiteImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--bunny-plush"
                src={introBunnyPlushImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--love"
                src={introLoveImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <img
                className="intro-decoration intro-decoration--tulip-envelope"
                src={introTulipEnvelopeImage}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            </div>

            <div className="intro-content">
              <h1 lang="en">Happy Birthday!</h1>
              <button className="envelope-trigger" type="button" onClick={() => goTo('menu')}>
                <img
                  className="intro-envelope-image"
                  src={messageEnvelopeImage}
                  alt=""
                  width={1270}
                  height={738}
                  decoding="async"
                  fetchPriority="high"
                />
                <span className="sr-only">Mở thiệp sinh nhật</span>
              </button>
              <p className="intro-signature" lang="en">for my favorite person</p>
            </div>
          </section>
        )}

        {view === 'menu' && (
          <section className="menu-view scene-enter">
            <div className="section-heading section-heading--light">
              <Sparkles size={19} />
              <h1 lang="en">Choose Your Surprise</h1>
              <p>Ba món quà nhỏ, thật nhiều yêu thương.</p>
            </div>

            <div className="surprise-grid">
              <button
                className="surprise-choice surprise-choice--message"
                type="button"
                onClick={() => goTo('message-envelope')}
                aria-label="Mở lời nhắn"
              >
                <span className="surprise-choice__art">
                  <img src={messageEnvelopeImage} alt="" />
                </span>
                <span className="surprise-choice__label" lang="en">Message</span>
                <span className="surprise-choice__sub">Một lời nhắn nhỏ</span>
              </button>

              <button
                className="surprise-choice"
                type="button"
                onClick={() => goTo('flowers')}
                aria-label="Xem bó hoa"
              >
                <span className="surprise-choice__art">
                  <img src={bouquetImage} alt="" />
                </span>
                <span className="surprise-choice__label" lang="en">Flowers</span>
                <span className="surprise-choice__sub">Một bó hoa dịu dàng</span>
              </button>

              <button
                className="surprise-choice"
                type="button"
                onClick={() => goTo('cake')}
                aria-label="Xem bánh sinh nhật"
              >
                <span className="surprise-choice__art">
                  <img src={cakeImage} alt="" />
                </span>
                <span className="surprise-choice__label" lang="en">Cake</span>
                <span className="surprise-choice__sub">Một điều ước ngọt ngào</span>
              </button>
            </div>
            <BackButton onClick={back} label="Quay về trang đầu" />
          </section>
        )}

        {view === 'message-envelope' && (
          <section className="message-view scene-enter">
            <div className={`message-envelope-wrap ${isLetterOpening ? 'is-opening' : ''}`}>
              <h1 className="eyebrow">Có một lá thư dành cho bạn</h1>
              <button
                className={`open-letter-button ${isLetterOpening ? 'is-opening' : ''}`}
                type="button"
                onClick={openLetter}
                aria-label={isLetterOpening ? 'Đang mở lá thư' : 'Mở lá thư'}
                disabled={isLetterOpening}
              >
                <span className="message-envelope-stage" aria-hidden="true">
                  <img className="message-envelope-image" src={messageEnvelopeImage} alt="" />
                  <span className="message-envelope-interior" />
                  <span
                    className="message-letter-preview"
                    onAnimationEnd={() => {
                      if (isLetterOpening) goTo('message-letter')
                    }}
                  >
                    <Heart size={20} fill="currentColor" />
                    <span lang="en">Happy Birthday!</span>
                  </span>
                  <img
                    className="message-envelope-pocket"
                    src={messageEnvelopeImage}
                    alt=""
                  />
                  <span className="message-envelope-open-pocket" />
                  <span className="message-envelope-flap">
                    <img src={messageEnvelopeImage} alt="" />
                  </span>
                </span>
              </button>
              <p className="sr-only" aria-live="polite">
                {isLetterOpening ? 'Lá thư đang mở' : ''}
              </p>
            </div>
            <BackButton onClick={back} label="Quay lại chọn bất ngờ" />
          </section>
        )}

        {view === 'message-letter' && (
          <section className="letter-view scene-enter">
            <h1 id="letter-title" className="sr-only">Lá thư sinh nhật</h1>
            <article className="letter-card" aria-labelledby="letter-title">
              <span className="paper-tape paper-tape--left" aria-hidden="true" />
              <span className="paper-tape paper-tape--right" aria-hidden="true" />
              <div className="letter-card__inner">
                <p className="letter-salutation">Người thương à,</p>
                <p>
                  Hôm nay là ngày đặc biệt của bạn, nhưng mình lại là người nhận được món quà lớn
                  nhất: được có bạn trong đời.
                </p>
                <p>
                  Mỗi nụ cười của bạn làm ngày thường trở nên rực rỡ, và từng khoảnh khắc bên nhau
                  đều hóa thành một kỷ niệm thật đẹp.
                </p>
                <p>
                  Mong tuổi mới mang đến cho bạn thật nhiều bình yên, những hành trình đáng nhớ và
                  tất cả những yêu thương mà bạn xứng đáng được nhận.
                </p>
                <p className="letter-wish">Chúc mừng sinh nhật, người mình yêu!</p>
                <p className="letter-signoff">Thương bạn, hôm nay và thật nhiều ngày về sau.</p>
              </div>
              <span className="ribbon-bow ribbon-bow--left" aria-hidden="true" />
              <span className="ribbon-bow ribbon-bow--right" aria-hidden="true" />
            </article>
            <BackButton onClick={back} label="Khép lá thư" />
          </section>
        )}

        {view === 'flowers' && (
          <section className="flowers-view scene-enter">
            <div className="section-heading section-heading--light flowers-heading">
              <Flower2 size={19} />
              <h1 lang="en">Flowers for You</h1>
              <p>Một bó hoa được gói bằng thật nhiều yêu thương.</p>
            </div>

            <div className="bouquet-layout">
              <img className="bouquet-main" src={bouquetImage} alt="Bó hoa mẫu đơn và tulip màu hồng" />
              {flowerNotes.map((note, index) => (
                <article className={`wish-note wish-note--${index + 1}`} key={note}>
                  <div className="wish-note__card">
                    <img
                      className="wish-note__paper"
                      src={flowerNoteImage}
                      alt=""
                      width={856}
                      height={535}
                      decoding="async"
                      aria-hidden="true"
                    />
                    <p className="wish-note__content">
                      <span>{note}</span>
                      <Heart
                        className="wish-note__heart"
                        size={14}
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    </p>
                  </div>
                </article>
              ))}
              <p className="bouquet-caption" lang="en">A bouquet made with love</p>
            </div>
            <BackButton onClick={back} label="Quay lại chọn bất ngờ" />
          </section>
        )}

        {view === 'cake' && (
          <section className="cake-view scene-enter">
            <div className="cake-heading">
              <h1 lang="en">Happy Birthday!</h1>
            </div>

            <div className={`cake-collage ${giftRevealed ? 'cake-collage--gift-ready' : ''}`}>
              <img
                className="cake-collage__image"
                src={cakeCollageImage}
                alt="Bánh sinh nhật màu hồng giữa đĩa than, hoa và ảnh Polaroid"
              />
              <span className="sparkle sparkle--one" aria-hidden="true">✦</span>
              <span className="sparkle sparkle--two" aria-hidden="true">✦</span>
              <span className="sparkle sparkle--three" aria-hidden="true">✦</span>

              {giftRevealed && (
                <button
                  className="gallery-gift"
                  type="button"
                  onClick={() => goTo('gallery')}
                  aria-label="Mở hộp quà kỷ niệm"
                >
                  <img src={introGiftImage} alt="" />
                  <span>Mở món quà</span>
                </button>
              )}
            </div>

            <button
              className={`wish-button ${wishMade ? 'wish-button--made' : ''}`}
              type="button"
              onClick={makeWish}
              disabled={wishMade}
            >
              {wishMade ? <Heart size={17} fill="currentColor" /> : <Sparkles size={17} />}
              {wishMade ? 'Điều ước đã được gửi' : 'Ước một điều'}
            </button>

            {wishMade && !giftRevealed && (
              <div className="confetti" key={wishEffectId} aria-hidden="true">
                {confetti.map((style, index) => (
                  <i key={index} style={style as CSSProperties} />
                ))}
              </div>
            )}
            <p className="sr-only" aria-live="polite">
              {giftRevealed
                ? 'Hộp quà kỷ niệm đã xuất hiện. Hãy mở món quà.'
                : wishMade
                  ? 'Điều ước sinh nhật của bạn đã được gửi.'
                  : ''}
            </p>
            <BackButton onClick={back} label="Quay lại chọn bất ngờ" />
          </section>
        )}

        {view === 'gallery' && (
          <section className="gallery-view scene-enter" aria-labelledby="gallery-title">
            <div className="gallery-heading">
              <Images size={20} aria-hidden="true" />
              <h1 id="gallery-title" lang="en">Our Little Memories</h1>
              <p>Một góc nhỏ để cất những điều thật thương.</p>
            </div>

            <article className="gallery-mobile-note" aria-label="Lời nhắn kỷ niệm">
              <p className="gallery-mobile-note__title">{galleryNote.title}</p>
              <p>{galleryNote.text}</p>
            </article>

            <div
              className={`gallery-album ${galleryFlip ? 'is-turning' : ''}`}
              role="group"
              aria-roledescription="album ảnh"
              aria-label="Album ảnh kỷ niệm"
              aria-busy={galleryFlip !== null}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'PageDown') {
                  event.preventDefault()
                  changeGalleryPage('next')
                } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
                  event.preventDefault()
                  changeGalleryPage('previous')
                }
              }}
            >
              <div className="gallery-book-note">
                <img
                  className="gallery-decoration gallery-decoration--love"
                  src={introLoveImage}
                  alt=""
                />
                <img
                  className="gallery-decoration gallery-decoration--bunny"
                  src={introBunnyPlushImage}
                  alt=""
                />
                <img
                  className="gallery-decoration gallery-decoration--tulips"
                  src={introTulipEnvelopeImage}
                  alt=""
                />

                <article className="gallery-note">
                  <span className="gallery-stamp" lang="en">Forever loved</span>
                  <p className="gallery-note__title">{galleryNote.title}</p>
                  <p className="gallery-note__text">{galleryNote.text}</p>
                  <Heart size={18} fill="currentColor" aria-hidden="true" />
                </article>
              </div>

              <div className="gallery-page-stage">
                {galleryFlip && (
                  <div className="gallery-photo-page gallery-photo-page--under" aria-hidden="true">
                    <GalleryPhotoPage pageIndex={galleryPageUnderneath} />
                  </div>
                )}

                <div
                  className={`gallery-photo-page ${
                    galleryFlip
                      ? `gallery-photo-page--turning gallery-photo-page--flip-${galleryFlip.direction}`
                      : ''
                  }`}
                  onAnimationEnd={(event) => {
                    if (
                      event.currentTarget === event.target &&
                      event.animationName.startsWith('galleryPageFlip')
                    ) {
                      finishGalleryFlip()
                    }
                  }}
                >
                  <GalleryPhotoPage pageIndex={galleryPageOnTop} />
                </div>

                <button
                  className="gallery-page-trigger"
                  type="button"
                  onClick={() => changeGalleryPage('next')}
                  disabled={galleryFlip !== null || galleryPage === galleryMemories.length - 1}
                  aria-disabled={galleryFlip !== null || galleryPage === galleryMemories.length - 1}
                  aria-label={
                    galleryPage === galleryMemories.length - 1
                      ? 'Đã đến ảnh cuối của album'
                      : `Lật sang ảnh tiếp theo: ${galleryMemories[galleryPage + 1].caption}`
                  }
                />
              </div>
            </div>

            <div className="gallery-navigation" role="group" aria-label="Điều khiển album">
              <button
                className="gallery-navigation__button"
                type="button"
                onClick={() => changeGalleryPage('previous')}
                disabled={galleryFlip !== null || galleryPage === 0}
                aria-label="Xem ảnh trước"
              >
                <ChevronLeft size={19} />
                <span>Trước</span>
              </button>

              <div className="gallery-progress">
                <span className="gallery-progress__count" aria-hidden="true">
                  {galleryPage + 1} / {galleryMemories.length}
                </span>
                <span className="gallery-progress__dots" aria-hidden="true">
                  {galleryMemories.map((memory, index) => (
                    <i className={index === galleryPage ? 'is-active' : ''} key={memory.src} />
                  ))}
                </span>
              </div>

              <button
                className="gallery-navigation__button"
                type="button"
                onClick={() => changeGalleryPage('next')}
                disabled={galleryFlip !== null || galleryPage === galleryMemories.length - 1}
                aria-label="Xem ảnh tiếp theo"
              >
                <span>Sau</span>
                <ChevronRight size={19} />
              </button>
            </div>

            <p className="gallery-flip-hint">
              {galleryPage === galleryMemories.length - 1
                ? 'Bạn đã xem đến trang cuối rồi ♡'
                : 'Chạm vào ảnh để lật sang trang tiếp theo.'}
            </p>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Trang {galleryPage + 1} trên {galleryMemories.length}: {galleryMemories[galleryPage].caption}
            </p>

            <BackButton onClick={back} label="Quay lại bánh sinh nhật" />
          </section>
        )}
      </main>

      <footer className="footer-note">
        <Heart size={13} fill="currentColor" /> <span lang="en">made with love by cn.cnhwn_</span>
      </footer>
    </div>
  )
}

export default App
