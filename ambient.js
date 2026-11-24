(() => {
  const layer = document.querySelector('.ambient-ribbons');
  const canvas = layer?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowLayout = matchMedia('(max-width: 740px)');
  const compactLayout = matchMedia('(max-width: 740px), (pointer: coarse)');
  const palettes = {
    dark: {
      shading: '#5295a4', reflection: '#9cf1ca', edge: '#d2fff1',
      tint: '#7e9edb', sheet: .12, lines: .25
    },
    light: {
      shading: '#81aca1', reflection: '#4e9f90', edge: '#ffffff',
      tint: '#6a88ad', sheet: .21, lines: .22
    }
  };
  let width = 0;
  let height = 0;
  let scale = 0;
  let motionFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function ribbon(x, y, length, depth, angle, phase, intensity, palette) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const slices = Array.from({ length: 53 }, (_, index) => {
      const t = index / 52;
      const swell = Math.sin(t * Math.PI);
      return {
        x: (t - .5) * length,
        y: depth * (.78 * Math.sin(t * 6.6 - 1.1 + phase) + .25 * Math.sin(t * 11 - phase * .6)),
        width: depth * (.12 + .47 * swell * Math.abs(Math.cos(t * 4.2 - .65 + phase * .48))),
        fold: depth * .31 * swell * Math.sin(t * 5.5 - phase)
      };
    });
    const pointY = (slice, lane) => slice.y + lane * slice.width + lane * lane * slice.fold;
    const drawLane = (lane, points) => {
      for (const slice of points) ctx.lineTo(slice.x, pointY(slice, lane));
    };
    const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(.25, palette.shading);
    gradient.addColorStop(.56, palette.reflection);
    gradient.addColorStop(.8, palette.tint);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(slices[0].x, pointY(slices[0], -1));
    drawLane(-1, slices);
    drawLane(1, slices.slice().reverse());
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.globalAlpha = intensity * palette.sheet;
    ctx.fill();

    const crest = .54 + Math.sin(phase * 1.4) * .19;
    const light = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    light.addColorStop(0, 'transparent');
    light.addColorStop(crest - .16, 'transparent');
    light.addColorStop(crest, palette.edge);
    light.addColorStop(crest + .16, 'transparent');
    light.addColorStop(1, 'transparent');

    for (let index = 0; index <= 24; index++) {
      const lane = index / 12 - 1;
      const ridge = index % 6 === 0;
      ctx.beginPath();
      ctx.moveTo(slices[0].x, pointY(slices[0], lane));
      drawLane(lane, slices);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = ridge ? 1.15 : .65;
      ctx.globalAlpha = intensity * palette.lines * (ridge ? 1.5 : .8);
      ctx.stroke();
      if (ridge) {
        ctx.strokeStyle = light;
        ctx.globalAlpha = intensity * .45;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const palette = palettes[root.dataset.theme] ?? palettes.dark;
    const mobile = narrowLayout.matches;
    const size = Math.max(mobile ? 540 : 760, Math.min(width * 1.08, 1600));

    ribbon(width * (mobile ? .88 : .83), height * (mobile ? .68 : .43),
      size, Math.min(height * .14, 135), mobile ? -.68 : -.52, .48, mobile ? .82 : 1, palette);
    ribbon(width * (mobile ? .16 : .12), height * (mobile ? 1.04 : .94),
      size * .77, Math.min(height * .105, 90), -.19, .66, mobile ? .4 : .52, palette);
  }

  function placeLayer() {
    motionFrame = 0;
    const scrollOffset = Math.min(scrollY / height, 1.5) * 14;
    layer.style.transform = `translate3d(${pointerX}px,${pointerY - scrollOffset}px,0)`;
  }

  function queueMotion() {
    if (!motionFrame && !compactLayout.matches && !reducedMotion.matches && height) {
      motionFrame = requestAnimationFrame(placeLayer);
    }
  }

  function resize() {
    const nextWidth = layer.clientWidth;
    const nextHeight = layer.clientHeight;
    if (!nextWidth || !nextHeight) return;
    const nextScale = Math.min(devicePixelRatio || 1, compactLayout.matches ? 1 : 1.25,
      Math.sqrt(2400000 / (nextWidth * nextHeight)));
    if (width === nextWidth && height === nextHeight && scale === nextScale) return;
    width = nextWidth;
    height = nextHeight;
    scale = nextScale;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
    queueMotion();
  }

  function resetPointer() {
    pointerX = 0;
    pointerY = 0;
    queueMotion();
  }

  function syncMotion() {
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    layer.style.removeProperty('transform');
    window.removeEventListener('scroll', queueMotion);
    if (!compactLayout.matches && !reducedMotion.matches) {
      window.addEventListener('scroll', queueMotion, { passive: true });
    }
    resetPointer();
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || compactLayout.matches || reducedMotion.matches || !width || !height) return;
    pointerX = (event.clientX / width - .5) * 18;
    pointerY = (event.clientY / height - .5) * 12;
    queueMotion();
  }, { passive: true });
  root.addEventListener('pointerleave', resetPointer);
  window.addEventListener('resize', resize);
  compactLayout.addEventListener('change', () => { resize(); syncMotion(); });
  reducedMotion.addEventListener('change', syncMotion);
  new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  syncMotion();
})();
