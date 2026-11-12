/**
 * CoolAirPro – script.js
 * ---------------------------------------------------------------------------
 *  1. Helpers
 *  2. Core UI            (works with or without the animation libraries)
 *  3. Motion engine      (GSAP + ScrollTrigger + Lenis)
 *       3.1 Smooth scrolling
 *       3.2 Intro: loader + hero
 *       3.3 Section reveals (one signature animation per section)
 *       3.4 Desktop-only effects (magnetic buttons, card spotlight)
 *
 * Accessibility: if the visitor prefers reduced motion, or the animation
 * libraries fail to load, the page simply shows normally with no animation.
 */
'use strict';

(() => {
  /* =======================================================================
     1. HELPERS
     ======================================================================= */
  const root = document.documentElement;
  const $  = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer       = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const MOBILE_BREAKPOINT    = 820;

  const { gsap, ScrollTrigger } = window;
  let lenis = null; // smooth-scroll instance (created in section 3.1)

  /** Wraps every word of an element in a masked <span> so it can slide up. */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((word) => `<span class="w"><span class="wi">${word.replace(/&/g, '&amp;')}</span></span>`)
      .join(' ');
    return $$('.wi', el);
  }

  /** ScrollTrigger config for "play once when this element scrolls into view". */
  const playOnce = (trigger, start = 'top 80%') => ({ trigger, start, once: true });

  /* =======================================================================
     2. CORE UI
     ======================================================================= */
  const header     = $('.nav');
  const menuButton = $('#navToggle');
  const menu       = $('#navLinks');

  /* ---- 2.1 Mobile menu ---- */
  function initMobileMenu() {
    // Each link gets an index so CSS can stagger the open animation.
    $$('a', menu).forEach((link, i) => link.style.setProperty('--i', i));

    menuButton.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', isOpen);
    });
  }

  /* ---- 2.2 Header: blur on scroll + sliding active indicator ---- */
  function initHeader() {
    const indicator = document.createElement('span');
    indicator.className = 'nav__ind';
    menu.appendChild(indicator);

    const links = $$('a:not(.btn)', menu);
    const sections = [
      { id: 'top',      el: $('.hero') },
      { id: 'services', el: $('#services') },
      { id: 'about',    el: $('#about') },
      { id: 'reviews',  el: $('#reviews') },
      { id: 'contact',  el: $('#contact') },
    ];
    let currentId = '';

    function moveIndicator() {
      const active = links.find((link) => link.classList.contains('is-active'));
      if (!active || innerWidth <= MOBILE_BREAKPOINT) return;

      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      requestAnimationFrame(() => indicator.classList.add('ready'));
    }

    function onScroll() {
      const y = scrollY;
      header.classList.toggle('is-scrolled', y > 40);

      // The active section is the last one whose top has passed the header.
      let activeId = 'top';
      sections.forEach(({ id, el }) => {
        if (id !== 'top' && el.getBoundingClientRect().top + y <= y + 140) activeId = id;
      });

      if (activeId === currentId) return;
      currentId = activeId;
      links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`));
      moveIndicator();
    }

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', moveIndicator);
    addEventListener('load', moveIndicator);
    document.fonts?.ready.then(moveIndicator);
    onScroll();
  }

  /* ---- 2.3 Anchor links: close the menu, glide with Lenis when available ---- */
  function initAnchorLinks() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      menu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');

      if (!lenis) return; // fall back to CSS `scroll-behavior: smooth`

      event.preventDefault();
      const id = link.getAttribute('href').slice(1);
      const target = id && id !== 'top' ? document.getElementById(id) : null;
      lenis.scrollTo(target || 0, {
        offset: target ? -70 : 0,
        duration: 1.6,
        easing: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2), // easeInOutQuart
      });
    });
  }

  /* ---- 2.4 FAQ accordion (height animation is pure CSS) ---- */
  function initFaq() {
    $$('.faq__item').forEach((item) => {
      const button = $('.faq__q', item);
      button.addEventListener('click', () => {
        const isOpen = item.classList.toggle('is-open');
        button.setAttribute('aria-expanded', isOpen);
        // Page height changed, so ScrollTrigger must re-measure once it settles.
        setTimeout(() => ScrollTrigger?.refresh(), 700);
      });
    });
  }

  /* ---- 2.5 Contact form (front-end only: connect to your backend/form service) ---- */
  function initContactForm() {
    const form    = $('#contactForm');
    const success = $('#formOk');

    form.addEventListener('input', (event) => event.target.classList.remove('is-invalid'));

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const required = $$('[required]', form);
      const empty = required.filter((field) => !field.value.trim());
      required.forEach((field) => field.classList.toggle('is-invalid', empty.includes(field)));

      if (empty.length) {
        empty[0].focus();
        return;
      }

      success.hidden = false;
      // Two frames so the browser registers the hidden -> visible change before fading in.
      requestAnimationFrame(() => requestAnimationFrame(() => success.classList.add('show')));
      form.reset();
    });
  }

  initMobileMenu();
  initHeader();
  initAnchorLinks();
  initFaq();
  initContactForm();

  /* =======================================================================
     3. MOTION ENGINE
     ======================================================================= */
  const loader  = $('.loader');
  const counter = $('[data-count]');

  /** Removes the loading screen and unlocks the page. */
  function finishLoading() {
    root.classList.remove('loading');
    loader?.remove();
  }

  // No animation libraries, or the visitor asked for less motion: show everything.
  if (prefersReducedMotion || !gsap || !ScrollTrigger) {
    finishLoading();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---- 3.1 Smooth scrolling (touch devices keep native scrolling) ---- */
  function initSmoothScroll() {
    if (!window.Lenis) return;

    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)), // easeOutExpo
      wheelMultiplier: 0.9,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // stays locked until the intro has played
  }

  /* ---- 3.2 Intro: loader wipe -> hero choreography ---- */
  function playIntro() {
    // Wrap each hero headline line in a mask so it can rise into view.
    $$('.hero__title > span').forEach((line) => {
      line.innerHTML = `<span class="li">${line.innerHTML}</span>`;
    });

    // Starting positions.
    gsap.set('.hero__title .li', { yPercent: 112 });
    gsap.set('.hero__bg', { clipPath: 'inset(0 0 0 100%)', scale: 1.16 });
    gsap.set(['.hero__text', '.hero__btns > *', '.scroll-ind'], { opacity: 0, y: 28 });
    gsap.set('.avatars img', { scale: 0.5, opacity: 0 });
    gsap.set('.hero__proof .stars svg', { opacity: 0, y: 10 });
    gsap.set('.proof__text p', { opacity: 0 });
    gsap.set('.loader__logo img', { clipPath: 'inset(0 100% 0 0)' });
    counter.textContent = '0';

    const countUp = () => {
      const progress = { value: 0 };
      gsap.to(progress, {
        value: 1000,
        duration: 2.2,
        ease: 'power3.out',
        onUpdate: () => (counter.textContent = Math.round(progress.value).toLocaleString('en-US')),
      });
    };

    gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: finishLoading })
      // Loader: logo wipes in, progress bar fills, then the whole screen lifts away.
      .to('.loader__logo img', { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power3.inOut' })
      .to('.loader__bar i', { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0)
      .to('.loader__logo', { y: -14, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.08')
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.95, ease: 'power4.inOut' }, '<0.05')
      .add(() => lenis?.start(), '<0.5')

      // Hero: layered entrance, everything overlaps from the "hero" label.
      .addLabel('hero', '<0.35')
      .to('.hero__bg', { clipPath: 'inset(0 0 0 0%)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath' }, 'hero')
      .to('.hero__bg', { scale: 1, duration: 2.4, ease: 'power3.out' }, 'hero')
      .to('.hero__title .li', { yPercent: 0, duration: 1.25, stagger: 0.12, ease: 'power4.out' }, 'hero+=0.2')
      .to('.hero__text', { opacity: 1, y: 0, duration: 1 }, 'hero+=0.65')
      .to('.hero__btns > *', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 'hero+=0.8')
      .to('.avatars img', { scale: 1, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 'hero+=0.95')
      .to('.hero__proof .stars svg', { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 }, 'hero+=1.05')
      .to('.proof__text p', { opacity: 1, duration: 0.8 }, 'hero+=1.15')
      .add(countUp, 'hero+=1.1')
      .to('.scroll-ind', { opacity: 1, y: 0, duration: 0.9 }, 'hero+=1.4');

    // Scroll-linked parallax + a gentle cursor-depth shift on desktop.
    const heroScroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__bg',    { yPercent: 12, ease: 'none', scrollTrigger: heroScroll });
    gsap.to('.hero__inner', { yPercent: -7, ease: 'none', scrollTrigger: heroScroll });

    if (hasFinePointer) {
      const shiftX = gsap.quickTo('.hero__bg', 'x', { duration: 1.4, ease: 'power3' });
      $('.hero').addEventListener('pointermove', (e) => shiftX((e.clientX / innerWidth - 0.5) * -22));
    }

    // Thin page-progress bar at the very top.
    gsap.to('.progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
  }

  /* ---- 3.3 Section reveals ---- */

  /** Each section heading uses its own voice so nothing feels repetitive. */
  const HEADING_STYLE = {
    services: 'rise',  // words slide up through a mask
    why:      'wipe',  // whole line wipes in from the left
    how:      'blur',  // words resolve from a soft blur
    projects: 'rise',
    reviews:  'wipe',
    about:    'rise',
    faq:      'blur',
    contact:  'wipe',
  };

  function revealHeadings() {
    $$('.head').forEach((head) => {
      const style   = HEADING_STYLE[head.closest('section').id] || 'rise';
      const eyebrow = $('.eyebrow', head);
      const title   = $('h2', head);

      const tl = gsap.timeline({
        scrollTrigger: playOnce(head, 'top 84%'),
        defaults: { ease: 'expo.out' },
      });

      // Eyebrow slides in while its teal underline draws itself (--u is read by the CSS).
      tl.from(eyebrow, { opacity: 0, x: -26, duration: 0.9 })
        .fromTo(eyebrow, { '--u': 0 }, { '--u': 1, duration: 1.1, ease: 'power3.inOut' }, 0.1);

      if (style === 'wipe') {
        tl.fromTo(
          title,
          { clipPath: 'inset(0 100% 0 0)', x: -34 },
          { clipPath: 'inset(0 0% 0 0)', x: 0, duration: 1.4, clearProps: 'clipPath,transform' },
          0.15
        );
        return;
      }

      const words = splitWords(title);
      if (style === 'rise') {
        gsap.set(words, { yPercent: 115 });
        tl.to(words, { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'power4.out' }, 0.15);
      } else {
        gsap.set(words, { opacity: 0, y: 26, filter: 'blur(10px)' });
        tl.to(words, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 0.05, clearProps: 'filter' }, 0.15);
      }
    });
  }

  /** Trust band: opens outward from the centre. */
  function revealTrustBar() {
    gsap.set('.trust__item', { opacity: 0, y: 28 });
    gsap.set('.trust__div', { scaleY: 0 });

    gsap.timeline({ scrollTrigger: playOnce('.trust', 'top 92%'), defaults: { ease: 'expo.out' } })
      .from('.trust', { clipPath: 'inset(0 50% 0 50%)', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath' })
      .to('.trust__item', { opacity: 1, y: 0, duration: 0.9, stagger: 0.14 }, 0.4)
      .to('.trust__div', { scaleY: 1, duration: 0.8, stagger: 0.14 }, 0.5);
  }

  /** Services: staggered rise, images settle from a zoom, icon badges pop in. */
  function revealServices() {
    const cards = $$('.service');
    gsap.set(cards, { opacity: 0, y: 80, scale: 0.95 });
    gsap.set('.service__media img', { scale: 1.25 });
    gsap.set('.service__badge', { scale: 0 });

    gsap.timeline({ scrollTrigger: playOnce('.services .cards', 'top 82%'), defaults: { ease: 'expo.out' } })
      .to(cards, { opacity: 1, y: 0, scale: 1, duration: 1.15, stagger: 0.12, clearProps: 'transform,opacity' })
      .to('.service__media img', { scale: 1, duration: 1.7, stagger: 0.12, ease: 'power3.out', clearProps: 'transform' }, 0)
      .to('.service__badge', { scale: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out', clearProps: 'transform' }, 0.55);
  }

  /** Why Choose Us: photo wipes in, ticks follow one by one. */
  function revealWhyChooseUs() {
    gsap.set('.why__media', { clipPath: 'inset(0 100% 0 0)' });
    gsap.set('.why__media img', { scale: 1.3 });
    gsap.set('.ticks li', { opacity: 0, x: -44 });
    gsap.set('.tick', { scale: 0 });
    gsap.set('.btn--explore', { opacity: 0, y: 22 });

    gsap.timeline({ scrollTrigger: playOnce('.why__grid', 'top 78%'), defaults: { ease: 'expo.out' } })
      .to('.why__media', { clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' })
      .to('.why__media img', { scale: 1, duration: 2, ease: 'power3.out', clearProps: 'transform' }, 0)
      .to('.ticks li', { opacity: 1, x: 0, duration: 1, stagger: 0.15, clearProps: 'transform,opacity' }, 0.45)
      .to('.tick', { scale: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out', clearProps: 'transform' }, 0.6)
      .to('.btn--explore', { opacity: 1, y: 0, duration: 0.9, clearProps: 'transform,opacity' }, 1.1);
  }

  /** How It Works: scroll-linked timeline, connector lines draw as you scroll. */
  function revealProcess() {
    const steps = $$('.step');
    const lines = $$('.step__line');

    gsap.set(steps, { opacity: 0, y: 40 });
    gsap.set('.step__circle', { scale: 0.7 });
    gsap.set(lines, { '--p': 0 }); // --p (0 -> 1) drives the line + arrow-head in CSS

    const timeline = gsap.timeline({
      scrollTrigger: { trigger: '.steps', start: 'top 78%', end: 'bottom 55%', scrub: 0.8 },
    });

    steps.forEach((step, i) => {
      timeline
        .to(step, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
        .to($('.step__circle', step), { scale: 1, duration: 1, ease: 'power3.out' }, '<');

      if (lines[i]) timeline.to(lines[i], { '--p': 1, duration: 1.4, ease: 'none' }, '<0.45');
    });
  }

  /** Projects: cards lift up like a curtain. */
  function revealProjects() {
    const cards = $$('.project');
    gsap.set(cards, { clipPath: 'inset(100% 0 0 0)', y: 50 });
    gsap.set('.project__img img', { scale: 1.35 });

    gsap.timeline({ scrollTrigger: playOnce('.projects .cards', 'top 82%'), defaults: { ease: 'expo.out' } })
      .to(cards, { clipPath: 'inset(0% 0 0 0)', y: 0, duration: 1.4, stagger: 0.13, clearProps: 'clipPath,transform' })
      .to('.project__img img', { scale: 1, duration: 1.9, stagger: 0.13, ease: 'power3.out', clearProps: 'transform' }, 0);
  }

  /** Call-to-action banner: scales in, background drifts with scroll. */
  function revealCtaBanner() {
    const words = splitWords($('.cta__text h2'));

    gsap.set('.cta', { opacity: 0, y: 60, scale: 0.95 });
    gsap.set(words, { yPercent: 115 });
    gsap.set(['.cta__text p', '.cta__btn'], { opacity: 0, y: 22 });

    gsap.timeline({ scrollTrigger: playOnce('.cta-wrap', 'top 82%'), defaults: { ease: 'expo.out' } })
      .to('.cta', { opacity: 1, y: 0, scale: 1, duration: 1.3, clearProps: 'transform,opacity' })
      .to(words, { yPercent: 0, duration: 1.1, stagger: 0.07, ease: 'power4.out' }, 0.35)
      .to(['.cta__text p', '.cta__btn'], { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'transform,opacity' }, 0.7);

    if (innerWidth > MOBILE_BREAKPOINT) {
      gsap.fromTo('.cta__bg', { yPercent: -8 }, {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  }

  /** Testimonials: cards fan out of a stack. */
  function revealTestimonials() {
    const tilt = [-4, 0, 4];
    gsap.set('.quote', {
      opacity: 0, y: 100, scale: 0.92,
      rotation: (i) => tilt[i % 3],
      transformOrigin: '50% 100%',
    });
    gsap.set('.quote__tri--tr', { scale: 0, transformOrigin: '100% 0' });
    gsap.set('.quote__tri--bl', { scale: 0, transformOrigin: '0 100%' });

    gsap.timeline({ scrollTrigger: playOnce('.reviews .cards', 'top 82%'), defaults: { ease: 'expo.out' } })
      .to('.quote', { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 1.4, stagger: 0.15, clearProps: 'transform,opacity' })
      .to('.quote__tri', { scale: 1, duration: 1, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }, 0.6);
  }

  /** About: team photo opens like AC vent slats; paragraph lights up word by word. */
  function revealAbout() {
    gsap.set('.about__media img', { scale: 1.3 });

    gsap.timeline({ scrollTrigger: playOnce('.about__grid', 'top 75%'), defaults: { ease: 'power4.inOut' } })
      .to($$('.louver i'), { scaleY: 0, duration: 1.1, stagger: 0.09, onComplete: () => $('.louver').remove() })
      .to('.about__media img', { scale: 1, duration: 2.2, ease: 'power3.out', clearProps: 'transform' }, 0);

    const paragraph = $('.about__content p');
    paragraph.innerHTML = paragraph.textContent.trim().split(/\s+/)
      .map((word) => `<span class="sw">${word}</span>`)
      .join(' ');

    gsap.fromTo($$('.sw', paragraph), { opacity: 0.15 }, {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: paragraph, start: 'top 82%', end: 'bottom 58%', scrub: 0.5 },
    });

    gsap.set('.btn--learn', { opacity: 0, y: 22 });
    gsap.to('.btn--learn', {
      opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', clearProps: 'transform,opacity',
      scrollTrigger: playOnce('.btn--learn', 'top 92%'),
    });
  }

  /** FAQ: each row slides in as it enters the viewport. */
  function revealFaq() {
    gsap.set('.faq__item', { opacity: 0, x: -50 });
    ScrollTrigger.batch('.faq__item', {
      start: 'top 90%',
      once: true,
      onEnter: (items) => gsap.to(items, {
        opacity: 1, x: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', clearProps: 'transform,opacity',
      }),
    });
  }

  /** Contact: info panel wipes in, then the form fields appear in sequence. */
  function revealContact() {
    const formItems = '.contact__form form > *:not(.form__ok)';

    gsap.set('.contact__info', { clipPath: 'inset(0 100% 0 0)' });
    gsap.set('.contact__list li', { opacity: 0, x: -30 });
    gsap.set(['.contact__form h3', '.contact__sub', formItems], { opacity: 0, y: 30 });

    gsap.timeline({ scrollTrigger: playOnce('.contact__card', 'top 78%'), defaults: { ease: 'expo.out' } })
      .to('.contact__info', { clipPath: 'inset(0 0% 0 0)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' })
      .to('.contact__list li', { opacity: 1, x: 0, duration: 0.9, stagger: 0.13, clearProps: 'transform,opacity' }, 0.6)
      .to(['.contact__form h3', '.contact__sub'], { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, clearProps: 'transform,opacity' }, 0.4)
      .to(formItems, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, clearProps: 'transform,opacity' }, 0.65);
  }

  /** Footer: columns rise, yellow bar wipes across. */
  function revealFooter() {
    gsap.set('.footer__grid > *', { opacity: 0, y: 40 });
    gsap.set('.footer__bar', { clipPath: 'inset(0 100% 0 0)' });

    gsap.timeline({ scrollTrigger: playOnce('.footer', 'top 92%'), defaults: { ease: 'expo.out' } })
      .to('.footer__grid > *', { opacity: 1, y: 0, duration: 1, stagger: 0.1, clearProps: 'transform,opacity' })
      .to('.footer__bar', { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.3);
  }

  /* ---- 3.4 Desktop-only effects ---- */

  /** Important buttons gently follow the cursor, within a small radius. */
  function initMagneticButtons() {
    const selector = [
      '.btn--hero', '.btn--hero2', '.nav__cta:not(.nav__cta--mobile)',
      '.cta__btn', '.btn--send', '.btn--explore', '.btn--learn',
    ].join(',');

    $$(selector).forEach((button) => {
      const moveX = gsap.quickTo(button, 'x', { duration: 0.55, ease: 'power3' });
      const moveY = gsap.quickTo(button, 'y', { duration: 0.55, ease: 'power3' });

      button.addEventListener('pointermove', (e) => {
        const rect = button.getBoundingClientRect();
        moveX((e.clientX - rect.left - rect.width / 2) * 0.2);
        moveY((e.clientY - rect.top - rect.height / 2) * 0.26);
      });
      button.addEventListener('pointerleave', () => { moveX(0); moveY(0); });
    });
  }

  /** A soft teal spotlight follows the cursor over cards marked `.spot`. */
  function initCardSpotlight() {
    let frame = 0;

    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest?.('.spot');
      if (!card || frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    }, { passive: true });
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  initSmoothScroll();

  const animations = gsap.context(() => {
    playIntro();
    revealHeadings();
    revealTrustBar();
    revealServices();
    revealWhyChooseUs();
    revealProcess();
    revealProjects();
    revealCtaBanner();
    revealTestimonials();
    revealAbout();
    revealFaq();
    revealContact();
    revealFooter();

    if (hasFinePointer) {
      initMagneticButtons();
      initCardSpotlight();
    }
  });

  // Tidy up when the page is left.
  addEventListener('pagehide', () => {
    animations.revert();
    lenis?.destroy();
  });
})();
