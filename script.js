const header = document.querySelector('.topbar');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#nav');
const navLinks = [...document.querySelectorAll('#nav a')];

window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 16), { passive: true });
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});
navLinks.forEach((link) => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}));
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
document.querySelectorAll('main section[id], footer[id]').forEach((section) => observer.observe(section));
document.querySelectorAll('video').forEach((video) => video.addEventListener('play', () => {
  document.querySelectorAll('video').forEach((other) => { if (other !== video && !other.paused) other.pause(); });
}));
document.querySelector('[data-year]').textContent = new Date().getFullYear();

const viewer = document.createElement('dialog');
viewer.className = 'image-viewer';
viewer.setAttribute('aria-labelledby', 'image-viewer-title');
viewer.innerHTML = `
  <div class="image-viewer-header">
    <span id="image-viewer-title">图片预览</span>
    <span class="image-viewer-scale">100%</span>
    <button type="button" class="image-viewer-close" aria-label="关闭图片预览" autofocus>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6L18 18M18 6L6 18" /></svg>
    </button>
  </div>
  <div class="image-viewer-stage">
    <img class="image-viewer-image" alt="" draggable="false" />
  </div>
  <p class="image-viewer-hint">滚轮缩放 · 按住左键平移 · 单击图片或空白处退出 · Esc 关闭</p>
`;
document.body.append(viewer);

const viewerImage = viewer.querySelector('.image-viewer-image');
const viewerStage = viewer.querySelector('.image-viewer-stage');
const viewerScale = viewer.querySelector('.image-viewer-scale');
const viewerState = { scale: 1, x: 0, y: 0, pointerId: null, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0, trigger: null };

const renderViewerTransform = () => {
  viewerImage.style.setProperty('--viewer-scale', viewerState.scale);
  viewerImage.style.setProperty('--viewer-x', `${viewerState.x}px`);
  viewerImage.style.setProperty('--viewer-y', `${viewerState.y}px`);
  viewerScale.textContent = `${Math.round(viewerState.scale * 100)}%`;
};

const openViewer = (src, alt, trigger) => {
  viewerState.scale = 1;
  viewerState.x = 0;
  viewerState.y = 0;
  viewerState.trigger = trigger;
  viewerImage.src = src;
  viewerImage.alt = alt || '放大的项目图片';
  renderViewerTransform();
  document.body.classList.add('viewer-open');
  viewer.showModal();
};

const stopViewerDrag = () => {
  const pointerId = viewerState.pointerId;
  viewerState.pointerId = null;
  viewerStage.classList.remove('dragging');
  if (pointerId !== null && viewerStage.hasPointerCapture(pointerId)) viewerStage.releasePointerCapture(pointerId);
};

const closeViewer = () => {
  if (!viewer.open) return;
  stopViewerDrag();
  viewer.close();
  document.body.classList.remove('viewer-open');
  const trigger = viewerState.trigger;
  viewerState.trigger = null;
  viewerImage.removeAttribute('src');
  trigger?.focus({ preventScroll: true });
};

document.querySelectorAll('[data-image-src]').forEach((button) => {
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    openViewer(button.dataset.imageSrc, image?.alt, button);
  });
});

document.querySelectorAll('.project-detail > .project-image').forEach((image) => {
  image.classList.add('zoomable-image');
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-label', `${image.alt || '项目图片'}，点击放大`);
  const open = () => openViewer(image.currentSrc || image.src, image.alt, image);
  image.addEventListener('click', open);
  image.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
});

viewerStage.addEventListener('wheel', (event) => {
  event.preventDefault();
  const previousScale = viewerState.scale;
  const bounds = viewerStage.getBoundingClientRect();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
  const nextScale = Math.min(8, Math.max(0.5, previousScale * Math.exp(-delta * 0.0015)));
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const pointerX = event.clientX - centerX;
  const pointerY = event.clientY - centerY;
  const ratio = nextScale / previousScale;
  viewerState.x = pointerX - (pointerX - viewerState.x) * ratio;
  viewerState.y = pointerY - (pointerY - viewerState.y) * ratio;
  viewerState.scale = nextScale;
  renderViewerTransform();
}, { passive: false });

viewerStage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || viewerState.pointerId !== null) return;
  event.preventDefault();
  viewerState.pointerId = event.pointerId;
  viewerState.moved = false;
  viewerState.startX = event.clientX;
  viewerState.startY = event.clientY;
  viewerState.baseX = viewerState.x;
  viewerState.baseY = viewerState.y;
  viewerStage.classList.add('dragging');
  viewerStage.setPointerCapture(event.pointerId);
});

viewerStage.addEventListener('pointermove', (event) => {
  if (viewerState.pointerId !== event.pointerId) return;
  const dx = event.clientX - viewerState.startX;
  const dy = event.clientY - viewerState.startY;
  if (Math.hypot(dx, dy) > 4) viewerState.moved = true;
  viewerState.x = viewerState.baseX + dx;
  viewerState.y = viewerState.baseY + dy;
  renderViewerTransform();
});

viewerStage.addEventListener('pointerup', (event) => {
  if (viewerState.pointerId !== event.pointerId || event.button !== 0) return;
  if (Math.hypot(event.clientX - viewerState.startX, event.clientY - viewerState.startY) > 4) viewerState.moved = true;
  stopViewerDrag();
  if (!viewerState.moved) closeViewer();
});

viewerStage.addEventListener('pointercancel', stopViewerDrag);
viewerStage.addEventListener('lostpointercapture', stopViewerDrag);
viewer.querySelector('.image-viewer-close').addEventListener('click', closeViewer);
viewer.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeViewer();
});
viewer.addEventListener('click', (event) => {
  if (event.target !== viewer) return;
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeViewer();
});
