// Shared colours, sizes and text styles. Text is large and high contrast,
// because Dad plays on a laptop (see docs/DESIGN.md).
export const COLOURS = {
  background: 0x16201c,   // behind everything
  panel: 0x1c2420,        // panel background
  panelEdge: 0x3a4a40,    // panel border
  button: 0x2a3630,       // button background
  buttonHover: 0x3a4a40,
  buttonDisabled: 0x222a26,
  accent: 0xf2c94c,       // hoiho-eye yellow, for highlights and the main action
  accentHover: 0xf7d877,
  done: 0x7cc47f,         // soft green: the tick on an area whose jobs are all done today
  text: '#fffbea',
  textDim: '#c8c2a8',
  textFaint: '#a39d86',     // faint captions: still readable on the dark panels
  accentText: '#f2c94c',
  dark: '#1c2420',
};

export const SIZES = {
  panelMin: 380,          // px: narrowest the side panel may get
  gap: 12,                // px: space between and inside panels
  buttonHeight: 46,       // px: big click targets
  smallButtonHeight: 40,
  minButtonHeight: 34,    // px: buttons never shrink below this
};

const FONT = 'Georgia, "Times New Roman", serif';

export const TEXT = {
  title: { fontFamily: FONT, fontSize: '30px', color: COLOURS.text },
  heading: { fontFamily: FONT, fontSize: '24px', color: COLOURS.accentText },
  body: { fontFamily: FONT, fontSize: '20px', color: COLOURS.text, lineSpacing: 5 },
  dim: { fontFamily: FONT, fontSize: '19px', color: COLOURS.textDim, lineSpacing: 4 },
  highlight: { fontFamily: FONT, fontSize: '20px', color: COLOURS.accentText, lineSpacing: 5 },
  button: { fontFamily: FONT, fontSize: '20px', color: COLOURS.text },
  buttonAccent: { fontFamily: FONT, fontSize: '21px', color: COLOURS.dark, fontStyle: 'bold' },
  buttonDisabled: { fontFamily: FONT, fontSize: '20px', color: COLOURS.textFaint },
  mapLabel: { fontFamily: FONT, fontSize: '21px', color: COLOURS.text, stroke: '#1c2420', strokeThickness: 6 },
  small: { fontFamily: FONT, fontSize: '18px', color: COLOURS.text, lineSpacing: 3 },
  smallFaint: { fontFamily: FONT, fontSize: '18px', color: COLOURS.textFaint, lineSpacing: 3 },
  smallAccent: { fontFamily: FONT, fontSize: '18px', color: COLOURS.accentText, fontStyle: 'italic' },
  badge: { fontFamily: FONT, fontSize: '19px', color: COLOURS.dark, fontStyle: 'bold' },
  hint: { fontFamily: FONT, fontSize: '20px', color: COLOURS.text, backgroundColor: '#1c2420e6', padding: { x: 12, y: 8 } },
};

// A panel title that fits on one line: the same style, with the font made
// smaller (down to `min` px) if the words are wider than `width`. Only titles
// are shrunk; any other style comes back unchanged.
export function fitTitle(scene, str, style, width, min = 22) {
  if (style !== TEXT.title) return style;
  const probe = scene.make.text({ x: 0, y: 0, text: str, style, add: false });
  let size = parseInt(style.fontSize, 10);
  const fits = Math.min(1, width / Math.max(1, probe.width));
  probe.destroy();
  size = Math.max(min, Math.floor(size * fits));
  return { ...style, fontSize: `${size}px` };
}
