'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { gsap } from 'gsap';
import { X } from 'lucide-react';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel?: string;
  link: string;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  changeMenuColorOnOpen?: boolean;
  isFixed?: boolean;
  accentColor?: string;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export const StaggeredMenu: React.FC<StaggeredMenuProps> = ({
  position = 'right',
  colors = ['#064e3b', '#059669', '#10b981'],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  className,
  logoUrl = '/shield-logo.svg',
  menuButtonColor = '#fff',
  openMenuButtonColor = '#10b981',
  changeMenuColorOnOpen = true,
  isFixed = true,
  accentColor = '#10b981',
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const router = useRouter();

  const panelRef = useRef<HTMLElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);

  const initLayers = useCallback(() => {
    const panel = panelRef.current;
    const preContainer = preLayersRef.current;
    if (!panel) return;

    let preLayers: HTMLElement[] = [];
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll<HTMLElement>('.sm-prelayer'));
    }
    preLayerElsRef.current = preLayers;

    const offscreen = position === 'left' ? -100 : 100;
    gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
    if (preContainer) {
      gsap.set(preContainer, { xPercent: 0, opacity: 1 });
    }
  }, [position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector<HTMLElement>('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll<HTMLElement>('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as any]: 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;

    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 0.8, ease: 'power4.out', stagger: { each: 0.08, from: 'start' } },
        itemsStart
      );

      if (numberEls.length) {
        tl.to(
          numberEls,
          { duration: 0.6, ease: 'power2.out', ['--sm-num-opacity' as any]: 1, stagger: { each: 0.08, from: 'start' } },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => gsap.set(socialLinks, { clearProps: 'opacity' })
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    initLayers();
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [initLayers, buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) {
      openRef.current = false;
      setOpen(false);
      busyRef.current = false;
      return;
    }

    const all = [...layers, panel];
    closeTweenRef.current?.kill();

    const offscreen = position === 'left' ? -100 : 100;

    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });

        const numberEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as any]: 0 });

        const socialTitle = panel.querySelector<HTMLElement>('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll<HTMLElement>('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

        openRef.current = false;
        setOpen(false);
        busyRef.current = false;
      }
    });
  }, [position]);

  const toggleMenu = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;

    if (!openRef.current) {
      openRef.current = true;
      setOpen(true);
      onMenuOpen?.();
      requestAnimationFrame(() => {
        playOpen();
      });
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [playOpen, playClose, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (openRef.current && !busyRef.current) {
      busyRef.current = true;
      onMenuClose?.();
      playClose();
    }
  }, [playClose, onMenuClose]);

  const handleLinkClick = useCallback((e: React.MouseEvent, href: string) => {
    // Instantly dismiss menu overlay so target page renders immediately
    openRef.current = false;
    setOpen(false);
    busyRef.current = false;
    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    onMenuClose?.();

    if (href.startsWith('/') && !href.startsWith('//')) {
      router.push(href);
    }
  }, [router, onMenuClose]);

  // Support external triggers via custom window event
  useEffect(() => {
    const handleTrigger = () => {
      toggleMenu();
    };
    window.addEventListener('toggle-staggered-menu', handleTrigger);
    return () => {
      window.removeEventListener('toggle-staggered-menu', handleTrigger);
    };
  }, [toggleMenu]);

  useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest('[data-menu-trigger]')) {
        return;
      }
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target)
      ) {
        // Instantly dismiss menu & backdrop so transition is immediate without lag
    openRef.current = false;
    setOpen(false);
    busyRef.current = false;
    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    onMenuClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeOnClickAway, open, closeMenu]);

  return (
    <div
      className={`sm-scope z-[9999] ${isFixed ? 'fixed inset-0 w-full h-full pointer-events-none' : 'w-full h-full'}`}
      style={{ display: open ? 'block' : 'none' }}
    >
      <div
        className={
          (className ? className + ' ' : '') + 'staggered-menu-wrapper pointer-events-none relative w-full h-full'
        }
        style={accentColor ? ({ ['--sm-accent']: accentColor } as React.CSSProperties) : undefined}
        data-position={position}
        data-open={open || undefined}
      >
        {/* Backdrop overlay when open */}
        {open && (
          <div
            onClick={closeMenu}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm pointer-events-auto z-[80] transition-opacity"
            aria-hidden="true"
          />
        )}

        <div
          ref={preLayersRef}
          className="sm-prelayers fixed top-0 right-0 bottom-0 pointer-events-none z-[90]"
          aria-hidden="true"
        >
          {(() => {
            const raw = colors && colors.length ? colors.slice(0, 4) : ['#064e3b', '#059669', '#10b981'];
            let arr = [...raw];
            if (arr.length >= 3) {
              const mid = Math.floor(arr.length / 2);
              arr.splice(mid, 1);
            }
            return arr.map((c, i) => (
              <div
                key={i}
                className="sm-prelayer absolute top-0 right-0 h-full w-full"
                style={{ background: c }}
              />
            ));
          })()}
        </div>

        {/* Floating close button inside overlay */}
        {open && (
          <header
            className="staggered-menu-header fixed top-3 right-3 sm:top-4 sm:right-6 bg-transparent pointer-events-none z-[120]"
            aria-label="Navigation close header"
          >
            <button
              ref={toggleBtnRef}
              data-menu-trigger
              className="sm-toggle relative inline-flex items-center gap-2 bg-zinc-950/95 dark:bg-zinc-900/95 hover:bg-zinc-900 text-white border-2 border-emerald-500/60 hover:border-emerald-400 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full cursor-pointer font-bold text-xs tracking-wider uppercase leading-none overflow-visible pointer-events-auto shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:shadow-[0_0_22px_rgba(16,185,129,0.55)] transition-all active:scale-95 z-[120]"
              aria-label="Close navigation menu"
              aria-expanded="true"
              aria-controls="staggered-menu-panel"
              onClick={closeMenu}
              type="button"
            >
              <X className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold tracking-wider text-xs text-white">
                CLOSE
              </span>
            </button>
          </header>
        )}

        <aside
          id="staggered-menu-panel"
          ref={panelRef}
          className="staggered-menu-panel pointer-events-auto"
          aria-hidden={!open}
          aria-label="Site Navigation"
        >
          <div className="sm-panel-inner">
            <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
              {items.map((item, idx) => (
                <li className="sm-panel-itemWrap" key={idx}>
                  <Link
                    className="sm-panel-item"
                    href={item.link}
                    prefetch={true}
                    aria-label={item.ariaLabel}
                    data-index={idx + 1}
                    onClick={(e) => handleLinkClick(e, item.link)}
                  >
                    <span className="sm-panel-itemLabel">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {displaySocials && socialItems && socialItems.length > 0 && (
              <div className="sm-socials" aria-label="Social Links">
                <h3 className="sm-socials-title">CAMPUS LINKS</h3>
                <ul className="sm-socials-list" role="list">
                  {socialItems.map((soc, idx) => (
                    <li key={idx} className="sm-socials-item">
                      <a
                        className="sm-socials-link text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-colors"
                        href={soc.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {soc.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      <style jsx global>{`
.sm-scope .staggered-menu-header { padding: 0.5rem 1rem; }
.sm-scope .staggered-menu-header > * { pointer-events: auto; }
.sm-scope .sm-panel-itemWrap { position: relative; overflow: hidden; line-height: 1; }
.sm-scope .staggered-menu-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: clamp(300px, 85vw, 480px);
  height: 100%;
  background: #07130d;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  padding: 5rem 2rem 2rem 2rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 100;
  border-left: 1px solid rgba(16, 185, 129, 0.25);
  pointer-events: auto;
}
.sm-scope [data-position='left'] .staggered-menu-panel {
  right: auto;
  left: 0;
  border-left: none;
  border-right: 1px solid rgba(16, 185, 129, 0.25);
}
.sm-scope .sm-prelayers {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: clamp(300px, 85vw, 480px);
  pointer-events: none;
  z-index: 90;
}
.sm-scope [data-position='left'] .sm-prelayers {
  right: auto;
  left: 0;
}
.sm-scope .sm-prelayer { position: absolute; top: 0; right: 0; height: 100%; width: 100%; }
.sm-scope .sm-panel-inner { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; }
.sm-scope .sm-socials { margin-top: auto; padding-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
.sm-scope .sm-socials-title { margin: 0; font-size: 0.75rem; font-weight: 700; color: var(--sm-accent, #10b981); letter-spacing: 0.05em; }
.sm-scope .sm-socials-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: row; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
.sm-scope .sm-socials-list .sm-socials-link { opacity: 0.85; transition: opacity 0.2s ease, color 0.2s ease; }
.sm-scope .sm-socials-list .sm-socials-link:hover { opacity: 1; color: var(--sm-accent, #10b981); }
.sm-scope .sm-panel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.85rem; }
.sm-scope .sm-panel-item { position: relative; color: #f4f4f5; font-size: 2.25rem; font-weight: 800; cursor: pointer; line-height: 1.1; letter-spacing: -1.5px; text-transform: uppercase; transition: color 0.2s ease; display: inline-block; text-decoration: none; padding-right: 1.4em; }
.sm-scope .sm-panel-itemLabel { display: inline-block; will-change: transform; transform-origin: 50% 100%; }
.sm-scope .sm-panel-item:hover { color: var(--sm-accent, #10b981); }
.sm-scope .sm-panel-list[data-numbering] { counter-reset: smItem; }
.sm-scope .sm-panel-list[data-numbering] .sm-panel-item::after { counter-increment: smItem; content: counter(smItem, decimal-leading-zero); position: absolute; top: 0.15em; right: 0.25em; font-size: 13px; font-weight: 700; font-family: monospace; color: var(--sm-accent, #10b981); letter-spacing: 0; pointer-events: none; user-select: none; opacity: var(--sm-num-opacity, 0); }
@media (max-width: 640px) {
  .sm-scope .staggered-menu-header { padding: 0.5rem 0.75rem !important; }
  .sm-scope .staggered-menu-panel {
    width: 100% !important;
    max-width: 100% !important;
    left: 0 !important;
    right: 0 !important;
    padding: 4.5rem 1.25rem 2rem 1.25rem !important;
  }
  .sm-scope .sm-prelayers {
    width: 100% !important;
    max-width: 100% !important;
    left: 0 !important;
    right: 0 !important;
  }
  .sm-scope .sm-panel-item {
    font-size: 1.75rem !important;
    letter-spacing: -1px !important;
  }
}
@media (max-width: 380px) {
  .sm-scope .sm-panel-item { font-size: 1.45rem !important; }
}
      `}</style>
    </div>
  );
};

export default StaggeredMenu;