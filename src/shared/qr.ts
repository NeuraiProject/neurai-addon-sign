// Neurai Wallet — QR code of a Neurai Connect pairing URI.
//
// Modules from the `qrcode` package (bundled in lib/NeuraiConnect.js), drawn on
// a canvas. Two rules keep it scannable, as in the faucet and the relay demo:
// dark modules on white in both themes (an inverted code is refused by many
// scanners), and error correction `Q` so the logo in the middle can cover
// modules. The brand colour only goes on the three finder patterns.

const DARK = '#111827';
const LIGHT = '#ffffff';
const EYE = '#9a3412';
const QUIET_MODULES = 2;
const LOGO_RATIO = 0.2;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, side: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + side - radius, y);
  ctx.quadraticCurveTo(x + side, y, x + side, y + radius);
  ctx.lineTo(x + side, y + side - radius);
  ctx.quadraticCurveTo(x + side, y + side, x + side - radius, y + side);
  ctx.lineTo(x + radius, y + side);
  ctx.quadraticCurveTo(x, y + side, x, y + side - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error(`could not load ${src}`)));
    img.src = src;
  });
}

/**
 * Draw `text` as a QR code into `canvas`, `cssSize` pixels wide. Resolves once
 * the logo is painted; without the logo the code is still valid.
 */
export async function renderQr(canvas: HTMLCanvasElement, text: string, cssSize = 240, logoSrc?: string): Promise<void> {
  const qr = NeuraiConnectSDK.createQr(text, { errorCorrectionLevel: 'Q' });
  const count = qr.modules.size;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  // A whole number of device pixels per module: fractional modules blur at
  // their edges, and a dense pairing URI leaves a decoder little margin.
  const side = count + QUIET_MODULES * 2;
  const module = Math.max(1, Math.floor((cssSize * dpr) / side));
  canvas.width = module * side;
  canvas.height = canvas.width;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const origin = QUIET_MODULES * module;
  ctx.fillStyle = LIGHT;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const span = Math.max(5, Math.round(count * LOGO_RATIO) | 1);
  const holeFrom = Math.floor((count - span) / 2);
  const holeTo = holeFrom + span - 1;
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);
  const inHole = (r: number, c: number) =>
    logoSrc !== undefined && r >= holeFrom && r <= holeTo && c >= holeFrom && c <= holeTo;

  ctx.fillStyle = DARK;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!qr.modules.get(r, c) || isFinder(r, c) || inHole(r, c)) continue;
      ctx.beginPath();
      ctx.arc(origin + c * module + module / 2, origin + r * module + module / 2, module * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const [row, col] of [[0, 0], [0, count - 7], [count - 7, 0]]) {
    const x = origin + col * module;
    const y = origin + row * module;
    ctx.fillStyle = EYE;
    roundRect(ctx, x, y, 7 * module, 7 * module * 0.28);
    ctx.fill();
    ctx.fillStyle = LIGHT;
    roundRect(ctx, x + module, y + module, 5 * module, 5 * module * 0.28);
    ctx.fill();
    ctx.fillStyle = EYE;
    roundRect(ctx, x + 2 * module, y + 2 * module, 3 * module, 3 * module * 0.28);
    ctx.fill();
  }

  if (logoSrc === undefined) return;
  const plate = origin + holeFrom * module;
  const plateSide = span * module;
  ctx.fillStyle = LIGHT;
  roundRect(ctx, plate, plate, plateSide, plateSide * 0.22);
  ctx.fill();
  try {
    const logo = await loadImage(logoSrc);
    const inset = plateSide * 0.1;
    ctx.drawImage(logo, plate + inset, plate + inset, plateSide - inset * 2, plateSide - inset * 2);
  } catch {
    // The white plate alone still scans.
  }
}
