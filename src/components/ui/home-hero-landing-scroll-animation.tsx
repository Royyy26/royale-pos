import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'

gsap.registerPlugin(ScrollTrigger)

/**
 * ============================================================================
 *  HERO LANDING — animasi scroll-pin
 *
 *  Diadaptasi dari pola scroll-pin GSAP: lima kartu foto merayap naik, mengecil
 *  ke ukuran ikon, lalu berlabuh pada celah-celah di dalam judul sementara
 *  kalimatnya tersingkap sepotong demi sepotong.
 *
 *  Penyesuaian dari sumber aslinya:
 *  - Jarak pin dipendekkan 8× → 4,5× tinggi layar (8 layar terlalu melelahkan).
 *  - Foto diganti kafe & makanan, bukan jam mewah/kota neon.
 *  - Palet mengikuti tema Warm Editorial aplikasi (kertas krem + espresso).
 *  - Seluruh animasi dimatikan bila pengguna meminta `prefers-reduced-motion`.
 *
 *  Komponen ini HANYA untuk halaman landing publik. Jangan dipakai di dalam
 *  aplikasi kasir — scroll-pin menghambat alur kerja operasional.
 * ============================================================================
 */

interface AnimationOrderItem {
  segment: HTMLElement
  originalIndex: number
}

/** Id tetap agar trigger lama bisa dimatikan saat efek dipasang ulang. */
const TRIGGER_ID = 'royale-hero-pin'

/** Foto kafe & makanan (Unsplash). Semua URL sudah diverifikasi termuat. */
const HERO_IMAGES: { src: string; alt: string }[] = [
  { src: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&q=75&auto=format&fit=crop', alt: 'Suasana kafe' },
  { src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=75&auto=format&fit=crop', alt: 'Secangkir kopi' },
  { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=75&auto=format&fit=crop', alt: 'Meja makan restoran' },
  { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=75&auto=format&fit=crop', alt: 'Hidangan siap saji' },
  { src: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&q=75&auto=format&fit=crop', alt: 'Interior restoran' },
]

/** Potongan kalimat judul; celah ikon disisipkan di antaranya. */
const TEXT_SEGMENTS = [
  'Kasir yang cepat,',
  'dapur yang tertata,',
  'stok yang terpantau,',
  'target yang terukur —',
  'semuanya dalam satu layar.',
]

export const HomeHeroLandingScrollAnimation: React.FC = () => {
  const animatedIconsRef = useRef<HTMLDivElement | null>(null)
  const heroHeaderRef = useRef<HTMLDivElement | null>(null)
  const heroSectionRef = useRef<HTMLElement | null>(null)
  const iconElementsRef = useRef<(HTMLDivElement | null)[]>([])
  const textSegmentsRef = useRef<(HTMLSpanElement | null)[]>([])
  const placeholdersRef = useRef<(HTMLElement | null)[]>([])
  const duplicateIconsRef = useRef<HTMLElement[] | null>(null)
  const textAnimationOrderRef = useRef<AnimationOrderItem[]>([])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const clearDuplicates = () => {
      duplicateIconsRef.current?.forEach((d) => d.parentNode?.removeChild(d))
      duplicateIconsRef.current = null
    }

    /**
     * Membongkar rangkaian sebelumnya. `kill(true)` penting: tanpa argumen itu
     * GSAP meninggalkan pin-spacer yatim sehingga halaman ikut rusak saat
     * efek dipasang ulang (mis. StrictMode di mode pengembangan).
     */
    const teardown = () => {
      ScrollTrigger.getById(TRIGGER_ID)?.kill(true)
      clearDuplicates()
    }

    /** Menandai apakah rangkaian scroll benar-benar pernah bergerak. */
    let progressAdvanced = false

    /**
     * Tampilkan judul apa adanya, tanpa rangkaian animasi. Latar foto ikut
     * diredupkan — pada mode ini foto tidak pernah memudar sendiri, dan teks
     * gelap di atas foto ramai tidak akan terbaca.
     */
    const showStatic = () => {
      textSegmentsRef.current.forEach((s) => s && gsap.set(s, { opacity: 1 }))
      gsap.set(animatedIconsRef.current, { opacity: 1, x: 0, y: 0, scale: 1 })
      gsap.set(heroHeaderRef.current, { opacity: 0.18 })
    }

    const setup = () => {
      teardown()

      // Tanpa animasi: tampilkan judul utuh, lewati seluruh rangkaian scroll.
      if (media.matches) {
        showStatic()
        return
      }

      buildTimeline()
    }

    const textSegments = textSegmentsRef.current
    const animationOrder: AnimationOrderItem[] = []
    textSegments.forEach((segment, index) => {
      if (segment) animationOrder.push({ segment, originalIndex: index })
    })

    // Urutan acak agar kalimat tersingkap tidak berurutan — terasa lebih hidup.
    for (let i = animationOrder.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[animationOrder[i], animationOrder[j]] = [animationOrder[j], animationOrder[i]]
    }
    textAnimationOrderRef.current = animationOrder

    const isMobile = window.innerWidth < 1000
    const headerIconSize = isMobile ? 34 : 58
    const currentIconSize = iconElementsRef.current[0]?.getBoundingClientRect().width || 1
    const exactScale = headerIconSize / currentIconSize

    function buildTimeline() {
    ScrollTrigger.create({
      id: TRIGGER_ID,
      trigger: heroSectionRef.current,
      scroller: window,
      start: 'top top',
      end: `+=${Math.round(window.innerHeight * 4.5)}`,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const progress = self.progress
        progressAdvanced = progressAdvanced || progress > 0.001

        textSegments.forEach((segment) => segment && gsap.set(segment, { opacity: 0 }))

        /* Fase 1 — kartu merayap naik, latar foto memudar. */
        if (progress < 0.3) {
          const moveProgress = progress / 0.3
          const containerMoveY = -window.innerHeight * 0.3 * moveProgress

          if (progress < 0.15) {
            const headerProgress = progress / 0.15
            gsap.set(heroHeaderRef.current, {
              transform: `translateY(${-50 * headerProgress}px)`,
              opacity: 1 - headerProgress,
            })
          } else {
            gsap.set(heroHeaderRef.current, { transform: 'translateY(-50px)', opacity: 0 })
          }

          clearDuplicates()
          gsap.set(animatedIconsRef.current, { x: 0, y: containerMoveY, scale: 1, opacity: 1 })

          iconElementsRef.current.forEach((icon, index) => {
            if (!icon) return
            const staggerDelay = index * 0.1
            const iconProgress = gsap.utils.mapRange(staggerDelay, staggerDelay + 0.5, 0, 1, moveProgress)
            gsap.set(icon, { x: 0, y: -containerMoveY * (1 - Math.max(0, Math.min(1, iconProgress))) })
          })

          /* Fase 2 — kumpulan kartu memusat dan mengecil ke ukuran ikon. */
        } else if (progress < 0.6) {
          const scaleProgress = (progress - 0.3) / 0.3
          gsap.set(heroHeaderRef.current, { transform: 'translateY(-50px)', opacity: 0 })
          clearDuplicates()

          const rect = animatedIconsRef.current!.getBoundingClientRect()
          const deltaX = (window.innerWidth / 2 - (rect.left + rect.width / 2)) * scaleProgress
          const deltaY = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * scaleProgress

          gsap.set(animatedIconsRef.current, {
            x: deltaX,
            y: -window.innerHeight * 0.3 + deltaY,
            scale: 1 + (exactScale - 1) * scaleProgress,
            opacity: 1,
          })
          iconElementsRef.current.forEach((icon) => icon && gsap.set(icon, { x: 0, y: 0 }))

          /* Fase 3 — kartu duplikat terbang ke celah di dalam judul. */
        } else if (progress < 0.75) {
          const moveProgress = (progress - 0.6) / 0.15
          gsap.set(heroHeaderRef.current, { transform: 'translateY(-50px)', opacity: 0 })

          const rect = animatedIconsRef.current!.getBoundingClientRect()
          gsap.set(animatedIconsRef.current, {
            x: window.innerWidth / 2 - (rect.left + rect.width / 2),
            y: -window.innerHeight * 0.3 + (window.innerHeight / 2 - (rect.top + rect.height / 2)),
            scale: exactScale,
            opacity: 0,
          })
          iconElementsRef.current.forEach((icon) => icon && gsap.set(icon, { x: 0, y: 0 }))

          if (!duplicateIconsRef.current) {
            duplicateIconsRef.current = []
            iconElementsRef.current.forEach((icon) => {
              if (!icon) return
              const duplicate = icon.cloneNode(true) as HTMLElement
              duplicate.className = 'duplicate-icon'
              Object.assign(duplicate.style, {
                position: 'absolute',
                width: `${headerIconSize}px`,
                height: `${headerIconSize}px`,
                borderRadius: '10px',
                overflow: 'hidden',
                zIndex: '50',
              })
              document.body.appendChild(duplicate)
              duplicateIconsRef.current!.push(duplicate)
            })
          }

          duplicateIconsRef.current?.forEach((duplicate, index) => {
            if (index >= placeholdersRef.current.length) return
            const iconRect = iconElementsRef.current[index]!.getBoundingClientRect()
            const startX = iconRect.left + iconRect.width / 2 + window.scrollX
            const startY = iconRect.top + iconRect.height / 2 + window.scrollY

            const targetRect = placeholdersRef.current[index]!.getBoundingClientRect()
            const targetX = targetRect.left + targetRect.width / 2 + window.scrollX
            const targetY = targetRect.top + targetRect.height / 2 + window.scrollY

            const moveX = targetX - startX
            const moveY = targetY - startY

            let currentX = 0
            const currentY = moveProgress < 0.5 ? moveY * (moveProgress / 0.5) : moveY
            if (moveProgress >= 0.5) currentX = moveX * ((moveProgress - 0.5) / 0.5)

            duplicate.style.left = `${startX + currentX - headerIconSize / 2}px`
            duplicate.style.top = `${startY + currentY - headerIconSize / 2}px`
            duplicate.style.opacity = '1'
            duplicate.style.display = 'flex'
          })

          /* Fase 4 — kartu berlabuh, kalimat tersingkap satu per satu. */
        } else {
          gsap.set(heroHeaderRef.current, { transform: 'translateY(-100px)', opacity: 0 })
          gsap.set(animatedIconsRef.current, { opacity: 0 })

          duplicateIconsRef.current?.forEach((duplicate, index) => {
            if (index >= placeholdersRef.current.length) return
            const targetRect = placeholdersRef.current[index]!.getBoundingClientRect()
            duplicate.style.left = `${targetRect.left + targetRect.width / 2 + window.scrollX - headerIconSize / 2}px`
            duplicate.style.top = `${targetRect.top + targetRect.height / 2 + window.scrollY - headerIconSize / 2}px`
            duplicate.style.opacity = '1'
            duplicate.style.display = 'flex'
          })

          textAnimationOrderRef.current.forEach((item, randomIndex) => {
            const segStart = 0.75 + randomIndex * 0.035
            const segProgress = gsap.utils.mapRange(segStart, segStart + 0.02, 0, 1, progress)
            gsap.set(item.segment, { opacity: Math.max(0, Math.min(1, segProgress)) })
          })
        }
      },
    })

    }

    setup()
    media.addEventListener('change', setup)

    // Foto hero baru termuat setelah komponen terpasang; tanpa hitung ulang,
    // titik mulai/akhir pin memakai tinggi layout yang sudah basi.
    const refresh = () => ScrollTrigger.refresh()
    const refreshTimer = window.setTimeout(refresh, 350)
    window.addEventListener('load', refresh)

    /**
     * Jaring pengaman. Pada sebagian lingkungan — peramban yang dikendalikan
     * otomatis, atau bila ScrollTrigger gagal terpasang — progres tidak pernah
     * beranjak meski halaman digulir. Tanpa ini judul akan tetap tak terlihat
     * dan hero tampak kosong. Begitu terdeteksi, animasi dilepas dan judul
     * ditampilkan apa adanya.
     */
    const watchdog = window.setInterval(() => {
      if (progressAdvanced) {
        window.clearInterval(watchdog)
        return
      }
      if (window.scrollY > window.innerHeight * 0.75) {
        window.clearInterval(watchdog)
        teardown()
        showStatic()
      }
    }, 500)

    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(watchdog)
      window.removeEventListener('load', refresh)
      media.removeEventListener('change', setup)
      teardown()
    }
  }, [])

  return (
    <div className="w-full bg-[#F7F4EF]">
      <style>{`
        .hero-bg-swiper { position: absolute; inset: 0; width: 100% !important; height: 100% !important; }
        .hero-bg-swiper .swiper-wrapper,
        .hero-bg-swiper .swiper-slide { width: 100% !important; height: 100% !important; }
        .hero-bg-swiper .swiper-slide { opacity: 0 !important; transition: opacity 1.2s ease !important; }
        .hero-bg-swiper .swiper-slide-active { opacity: 1 !important; }
      `}</style>

      <section
        ref={heroSectionRef}
        className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#F7F4EF] px-4 text-ink-900 md:px-6"
      >
        {/* Latar foto bergantian */}
        <div ref={heroHeaderRef} className="absolute inset-0 h-full w-full will-change-transform" style={{ zIndex: 0 }}>
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            autoplay={{ delay: 3200, disableOnInteraction: false }}
            loop
            speed={1200}
            className="hero-bg-swiper"
          >
            {HERO_IMAGES.map((img, i) => (
              <SwiperSlide key={i} style={{ position: 'relative', overflow: 'hidden' }}>
                <img
                  src={img.src}
                  alt={img.alt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background:
                      'linear-gradient(to bottom, rgba(247,244,239,0.62) 0%, rgba(247,244,239,0.34) 45%, rgba(247,244,239,0.86) 100%)',
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Baris kartu yang dianimasikan */}
        <div
          ref={animatedIconsRef}
          className="fixed bottom-10 left-1/2 z-[2] flex w-[90%] -translate-x-1/2 items-center gap-2 will-change-transform md:left-[10%] md:w-[80%] md:translate-x-0"
        >
          {HERO_IMAGES.map((img, index) => (
            <div
              key={index}
              ref={(el) => {
                iconElementsRef.current[index] = el
              }}
              className="aspect-square flex-1 overflow-hidden rounded-xl bg-ink-100 shadow-elev ring-1 ring-ink-900/10 will-change-transform"
            >
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        {/* Judul dengan celah tempat kartu berlabuh */}
        <h1 className="relative z-10 max-w-[90vw] text-center font-display text-[clamp(1.5rem,5vw,4.2rem)] font-semibold leading-[1.25] tracking-tightest text-ink-900 md:max-w-[85vw]">
          {TEXT_SEGMENTS.map((text, i) => (
            <span key={i}>
              <span
                ref={(el) => {
                  textSegmentsRef.current[i] = el
                }}
                className="opacity-0"
              >
                {text}
              </span>
              <span
                ref={(el) => {
                  placeholdersRef.current[i] = el
                }}
                className="mx-1 inline-block h-8 w-8 align-middle will-change-transform md:-mt-1.5 md:h-14 md:w-14"
                style={{ visibility: 'hidden' }}
              />
            </span>
          ))}
        </h1>

        {/* Petunjuk gulir */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">
          Gulir
        </div>
      </section>
    </div>
  )
}

export default HomeHeroLandingScrollAnimation
