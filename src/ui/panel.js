// Shared UI pieces: a panel box and a big button. Each returns Phaser objects
// so the caller can put them in a container.
import { COLOURS, SIZES, TEXT } from './styles.js';

export function panel(scene, x, y, w, h) {
  return scene.add.graphics()
    .fillStyle(COLOURS.panel, 0.94).fillRoundedRect(x, y, w, h, 10)
    .lineStyle(2, COLOURS.panelEdge, 1).strokeRoundedRect(x, y, w, h, 10);
}

// A wide button. Options:
//   selected  outlined in the highlight colour
//   accent    filled with the highlight colour (the main action on a screen)
//   disabled  dimmed and not clickable
//   height    defaults to SIZES.buttonHeight
//   center    centre the label
//   right     a second, dimmer label at the right-hand end (e.g. a job's time)
// Calls onClick when clicked and onHover(true/false) as the mouse comes and goes.
export function button(scene, x, y, w, label, opts = {}) {
  const { selected = false, accent = false, disabled = false, center = false, onClick, onHover } = opts;
  const h = opts.height ?? SIZES.buttonHeight;
  const bg = scene.add.graphics();
  const fill = hover => (accent ? (hover ? COLOURS.accentHover : COLOURS.accent)
    : disabled ? COLOURS.buttonDisabled : hover ? COLOURS.buttonHover : COLOURS.button);
  const draw = hover => {
    bg.clear().fillStyle(fill(hover), 1).fillRoundedRect(x, y, w, h, 8);
    if (selected) bg.lineStyle(3, COLOURS.accent, 1).strokeRoundedRect(x, y, w, h, 8);
  };
  draw(false);
  const style = accent ? TEXT.buttonAccent : disabled ? TEXT.buttonDisabled : TEXT.button;
  const right = opts.right
    ? scene.add.text(x + w - 14, y + h / 2, opts.right, { ...style, color: disabled ? COLOURS.textFaint : COLOURS.textDim }).setOrigin(1, 0.5)
    : null;
  const room = right ? w - 32 - right.width - 12 : center ? w - 20 : w - 32;
  const text = center
    ? scene.add.text(x + w / 2, y + h / 2, label, style).setOrigin(0.5)
    : scene.add.text(x + 16, y + h / 2, label, style).setOrigin(0, 0.5);
  // A label too wide for its button wraps onto two lines (it never shrinks below 18px).
  if (text.width > room) {
    text.setStyle({ ...style, fontSize: '18px', align: center ? 'center' : 'left', wordWrap: { width: room }, lineSpacing: -2 });
    if (!center) text.setOrigin(0, 0.5);
  }
  const zone = scene.add.zone(x, y, w, h).setOrigin(0);
  if (!disabled) {
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { draw(true); onHover?.(true); });
    zone.on('pointerout', () => { draw(false); onHover?.(false); });
    zone.on('pointerdown', () => onClick?.());
  } else if (onHover) {
    zone.setInteractive();
    zone.on('pointerover', () => onHover(true));
    zone.on('pointerout', () => onHover(false));
  }
  return right ? [bg, text, right, zone] : [bg, text, zone];
}

// A gentle cue on a picture you can click: a soft yellow glow that slowly
// breathes in and out, so nothing relies on hovering to be found. Needs the
// WebGL renderer; on Canvas it quietly does nothing.
export function clickCue(scene, im) {
  const fx = im.preFX;
  if (!fx) return null;
  fx.setPadding(14);
  const glow = fx.addGlow(COLOURS.accent, 1, 0, false, 0.1, 14);
  return scene.tweens.add({ targets: glow, outerStrength: 5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}
