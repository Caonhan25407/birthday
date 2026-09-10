import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, Heart, X } from 'lucide-react'
import './PhotoGallery.css'

export type Memory = {
  src: string
  alt: string
  caption: string
  width: number
  height: number
}

type PhotoGalleryProps = {
  memories: readonly Memory[]
}

export default function PhotoGallery({ memories }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const selectedMemory = selectedIndex === null ? null : memories[selectedIndex]

  useEffect(() => {
    if (selectedIndex === null || dialogRef.current?.open) return
    dialogRef.current?.showModal()
    closeRef.current?.focus({ preventScroll: true })
  }, [selectedIndex])

  const changePhoto = (direction: number) => {
    setSelectedIndex((current) => current === null ? null :
      (current + direction + memories.length) % memories.length)
  }

  const closePhoto = () => {
    setSelectedIndex(null)
    dialogRef.current?.close()
    triggerRef.current?.focus({ preventScroll: true })
  }

  return (
    <section className="photo-gallery scene-enter" aria-label="Gallery ảnh sinh nhật">
      <div className="memory-grid memory-grid--collage" id="memory-grid">
        {memories.map((memory, index) => (
          <button
            className={`memory-card memory-card--${memories.indexOf(memory) + 1}`}
            key={memory.src}
            type="button"
            aria-label={`Xem ảnh: ${memory.caption}`}
            aria-haspopup="dialog"
            onClick={(event) => {
              triggerRef.current = event.currentTarget
              setSelectedIndex(index)
            }}
          >
            <span className="memory-card__image-wrap">
              <img src={memory.src} alt={memory.alt} width={memory.width} height={memory.height} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
              <span className="memory-card__expand" aria-hidden="true"><ArrowUpRight size={20} /></span>
            </span>
          </button>
        ))}
        <div className="memory-cutout-title" role="img" aria-label="Happy Birthday" lang="en">
          {['happy', 'birthday'].map((word) => (
            <span className={`memory-cutout-title__word memory-cutout-title__word--${word}`} key={word}>
              {[...word].map((letter, index) => <i key={index} aria-hidden="true">{letter}</i>)}
            </span>
          ))}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="memory-lightbox"
        aria-label="Xem ảnh kỷ niệm"
        onCancel={(event) => {
          event.preventDefault()
          closePhoto()
        }}
        onClose={() => {
          // A queued close event can arrive after another photo has already opened.
          if (dialogRef.current?.open) return
          setSelectedIndex(null)
          triggerRef.current?.focus({ preventScroll: true })
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePhoto()
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            changePhoto(event.key === 'ArrowRight' ? 1 : -1)
          }
        }}
      >
        {selectedMemory && selectedIndex !== null && (
          <div className="memory-lightbox__surface">
            <div className="memory-lightbox__topbar">
              <span><Heart size={15} aria-hidden="true" /> Một khoảnh khắc thật thương</span>
              <button ref={closeRef} type="button" onClick={closePhoto} aria-label="Đóng ảnh"><X size={23} /></button>
            </div>
            <div className="memory-lightbox__stage">
              <button className="memory-lightbox__previous" type="button" onClick={() => changePhoto(-1)} aria-label="Ảnh trước">
                <ChevronLeft size={25} />
              </button>
              <div
                className="memory-lightbox__image-wrap"
                onPointerDown={(event) => {
                  if (event.pointerType === 'touch') touchStartRef.current = { x: event.clientX, y: event.clientY }
                }}
                onPointerUp={(event) => {
                  const start = touchStartRef.current
                  touchStartRef.current = null
                  if (!start) return
                  const deltaX = event.clientX - start.x
                  const deltaY = event.clientY - start.y
                  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) changePhoto(deltaX < 0 ? 1 : -1)
                }}
                onPointerCancel={() => { touchStartRef.current = null }}
              >
                <img key={selectedMemory.src} src={selectedMemory.src} alt={selectedMemory.alt} decoding="async" />
              </div>
              <button className="memory-lightbox__next" type="button" onClick={() => changePhoto(1)} aria-label="Ảnh tiếp theo">
                <ChevronRight size={25} />
              </button>
            </div>
            <div className="memory-lightbox__bottom">
              <div aria-live="polite" aria-atomic="true">
                <span className="memory-lightbox__count">{selectedIndex + 1} / {memories.length}</span>
                <p>{selectedMemory.caption}</p>
              </div>
              <a href={selectedMemory.src} download={`ky-niem-${memories.indexOf(selectedMemory) + 1}.webp`} aria-label="Tải ảnh về">
                <Download size={19} />
              </a>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}
