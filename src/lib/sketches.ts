/**
 * Sketch Illustration Engine
 *
 * Generates inline SVG "sketchy" illustrations for vocabulary words.
 * These are intentionally rough and hand-drawn looking — this style is
 * actually *better* for memory retention than photos (keyword: "desirable
 * difficulty" in cognitive science).
 *
 * Strategy:
 *  1. Check the built-in catalog (common A1–B1 words) → deterministic SVG
 *  2. If the word has a known emoji, render it large in an SVG frame
 *  3. Final fallback: a letter-initial badge
 *
 * Zero network requests. Works fully offline.
 */

// ---------------------------------------------------------------------------
// Emoji catalog — covers most A1/A2 concrete nouns
// ---------------------------------------------------------------------------
const EMOJI_MAP: Record<string, string> = {
  // Greetings / gestures
  hello: "👋",
  goodbye: "👋",
  wave: "👋",
  "مرحبا": "👋",
  "شكرا": "🙏",
  "نعم": "✅",
  "لا": "❌",
  // Time
  "good morning": "🌅",
  "good night": "🌙",
  morning: "🌅",
  night: "🌙",
  evening: "🌆",
  noon: "☀️",
  sunrise: "🌄",
  sunset: "🌇",
  today: "📅",
  tomorrow: "📅",
  yesterday: "📅",
  // Polite words
  "thank you": "🙏",
  thanks: "🙏",
  please: "🙏",
  sorry: "😔",
  excuse: "🙏",
  welcome: "🤝",
  yes: "✅",
  no: "❌",
  // Family
  family: "👨‍👩‍👧‍👦",
  mother: "👩",
  father: "👨",
  mom: "👩",
  dad: "👨",
  sister: "👧",
  brother: "👦",
  son: "👦",
  daughter: "👧",
  grandmother: "👵",
  grandfather: "👴",
  baby: "👶",
  child: "🧒",
  // Food
  food: "🍽️",
  eat: "🍽️",
  water: "💧",
  bread: "🍞",
  rice: "🍚",
  meat: "🥩",
  chicken: "🍗",
  fish: "🐟",
  egg: "🥚",
  milk: "🥛",
  coffee: "☕",
  tea: "🍵",
  juice: "🧃",
  fruit: "🍎",
  apple: "🍎",
  banana: "🍌",
  orange: "🍊",
  vegetable: "🥦",
  salad: "🥗",
  soup: "🍲",
  pizza: "🍕",
  pasta: "🍝",
  burger: "🍔",
  // Numbers / counting
  one: "1️⃣",
  two: "2️⃣",
  three: "3️⃣",
  four: "4️⃣",
  five: "5️⃣",
  zero: "0️⃣",
  // Colors
  red: "🔴",
  blue: "🔵",
  green: "🟢",
  yellow: "🟡",
  black: "⚫",
  white: "⚪",
  orange_color: "🟠",
  school: "🏫",
  work: "💼",
  hospital: "🏥",
  market: "🏪",
  church: "⛪",
  mosque: "🕌",
  left: "⬅️",
  right: "➡️",
  straight: "⬆️",
  stop: "🛑",
  go: "🚦",
  // Travel / transport
  car: "🚗",
  bus: "🚌",
  train: "🚂",
  plane: "✈️",
  taxi: "🚕",
  bike: "🚲",
  walk: "🚶",
  airport: "✈️",
  // Weather
  sun: "☀️",
  rain: "🌧️",
  snow: "❄️",
  wind: "💨",
  cloud: "☁️",
  hot: "🔥",
  cold: "🥶",
  weather: "⛅",
  // Body
  head: "🗣️",
  hand: "✋",
  eye: "👁️",
  ear: "👂",
  mouth: "👄",
  nose: "👃",
  heart: "❤️",
  // Emotions
  happy: "😊",
  sad: "😢",
  angry: "😠",
  tired: "😴",
  sick: "🤒",
  love: "❤️",
  afraid: "😨",
  surprised: "😲",
  // Objects
  book: "📚",
  pen: "✏️",
  phone: "📱",
  computer: "💻",
  money: "💰",
  key: "🔑",
  door: "🚪",
  window: "🪟",
  table: "🪑",
  chair: "🪑",
  bed: "🛏️",
  bag: "👜",
  clothes: "👕",
  shirt: "👕",
  shoes: "👟",
  hat: "🎩",
  // Actions
  run: "🏃",
  sleep: "😴",
  read: "📖",
  write: "✍️",
  talk: "💬",
  listen: "👂",
  buy: "🛒",
  sell: "🏷️",
  give: "🤲",
  take: "✋",
  open: "📂",
  close: "📁",
  // Nature
  tree: "🌳",
  flower: "🌸",
  mountain: "⛰️",
  river: "🏞️",
  sea: "🌊",
  fire: "🔥",
  earth: "🌍",
  moon: "🌙",
  star: "⭐",
  // Time / calendar
  day: "☀️",
  week: "📅",
  month: "📅",
  year: "📅",
  hour: "⏰",
  minute: "⏱️",
  clock: "🕐",
  // Days of week
  monday: "📅",
  tuesday: "📅",
  wednesday: "📅",
  thursday: "📅",
  friday: "📅",
  saturday: "📅",
  sunday: "📅",
};

// ---------------------------------------------------------------------------
// Custom SVG sketches for words that benefit from more than an emoji
// These are intentionally simple, monochrome, "sketchy" paths.
// ---------------------------------------------------------------------------
type SketchRenderer = () => string; // returns inner SVG content (no <svg> wrapper)

const SKETCH_MAP: Record<string, SketchRenderer> = {
  hello: () => `
    <g stroke="#1e3a5f" stroke-width="2.5" fill="none" stroke-linecap="round">
      <!-- waving hand -->
      <path d="M44 56 Q40 30 48 20" stroke-width="3"/>
      <path d="M48 20 Q52 12 58 18 Q54 26 52 32" />
      <path d="M52 32 Q56 22 62 26 Q60 34 56 38"/>
      <path d="M56 38 Q62 30 67 34 Q65 42 60 46"/>
      <path d="M60 46 Q66 40 70 44 Q68 52 62 56 Q56 62 48 60 Q42 58 44 56"/>
      <!-- speech bubble -->
      <rect x="60" y="15" width="38" height="24" rx="6" fill="#e0f2fe" stroke="#0EA5E9"/>
      <path d="M72 39 L68 46 L78 39" fill="#e0f2fe" stroke="#0EA5E9" stroke-linejoin="round"/>
      <text x="79" y="31" font-size="11" font-family="sans-serif" fill="#0EA5E9" text-anchor="middle">Hi!</text>
    </g>`,

  book: () => `
    <g stroke="#1e3a5f" stroke-width="2" fill="none" stroke-linecap="round">
      <rect x="30" y="22" width="48" height="60" rx="3" fill="#fef3c7" stroke="#92400e"/>
      <rect x="25" y="22" width="8" height="60" rx="2" fill="#fde68a" stroke="#92400e"/>
      <line x1="37" y1="35" x2="70" y2="35"/>
      <line x1="37" y1="45" x2="70" y2="45"/>
      <line x1="37" y1="55" x2="70" y2="55"/>
      <line x1="37" y1="65" x2="55" y2="65"/>
    </g>`,

  water: () => `
    <g stroke-linecap="round">
      <path d="M54 20 Q54 20 40 48 Q36 58 44 66 Q54 76 66 66 Q74 58 68 48 Z"
            fill="#bae6fd" stroke="#0284c7" stroke-width="2.5" fill-opacity="0.7"/>
      <path d="M48 56 Q52 52 58 56" fill="none" stroke="white" stroke-width="2" opacity="0.6"/>
    </g>`,

  house: () => `
    <g stroke="#1e3a5f" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="54,18 20,50 88,50" fill="#fca5a5" stroke="#991b1b"/>
      <rect x="28" y="50" width="52" height="36" fill="#fef3c7" stroke="#92400e"/>
      <rect x="45" y="62" width="18" height="24" rx="2" fill="#93c5fd" stroke="#1d4ed8"/>
      <rect x="32" y="58" width="12" height="12" rx="1" fill="#93c5fd" stroke="#1d4ed8"/>
    </g>`,

  school: () => `
    <g stroke="#1e3a5f" stroke-width="2" fill="none" stroke-linecap="round">
      <rect x="20" y="36" width="68" height="48" fill="#e0f2fe" stroke="#0369a1"/>
      <rect x="38" y="18" width="32" height="22" fill="#bae6fd" stroke="#0369a1"/>
      <polygon points="54,10 32,22 76,22" fill="#7dd3fc" stroke="#0369a1"/>
      <rect x="44" y="56" width="20" height="28" rx="1" fill="#fef9c3" stroke="#713f12"/>
      <rect x="25" y="48" width="14" height="14" fill="#93c5fd" stroke="#1e40af"/>
      <rect x="69" y="48" width="14" height="14" fill="#93c5fd" stroke="#1e40af"/>
      <!-- flag on top -->
      <line x1="54" y1="10" x2="54" y2="2" stroke="#374151" stroke-width="1.5"/>
      <polygon points="54,2 62,5 54,8" fill="#ef4444" stroke="none"/>
    </g>`,

  sun: () => `
    <g stroke="#ca8a04" stroke-width="2.5" stroke-linecap="round">
      <circle cx="54" cy="50" r="18" fill="#fde68a" stroke="#d97706"/>
      ${[0,45,90,135,180,225,270,315].map(a => {
        const r = Math.PI * a / 180;
        const x1 = 54 + 22 * Math.cos(r), y1 = 50 + 22 * Math.sin(r);
        const x2 = 54 + 30 * Math.cos(r), y2 = 50 + 30 * Math.sin(r);
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      }).join('')}
    </g>`,

  cat: () => `
    <g stroke="#374151" stroke-width="2" stroke-linecap="round" fill="none">
      <ellipse cx="54" cy="58" rx="26" ry="20" fill="#e5e7eb"/>
      <circle cx="54" cy="40" r="16" fill="#e5e7eb" stroke="#374151"/>
      <!-- ears -->
      <polygon points="42,30 36,16 50,26" fill="#e5e7eb" stroke="#374151"/>
      <polygon points="66,30 72,16 58,26" fill="#e5e7eb" stroke="#374151"/>
      <!-- face -->
      <circle cx="48" cy="38" r="3" fill="#1f2937"/>
      <circle cx="60" cy="38" r="3" fill="#1f2937"/>
      <path d="M50 44 Q54 48 58 44" stroke="#9ca3af"/>
      <!-- whiskers -->
      <line x1="34" y1="42" x2="48" y2="43"/><line x1="34" y1="46" x2="48" y2="45"/>
      <line x1="74" y1="42" x2="60" y2="43"/><line x1="74" y1="46" x2="60" y2="45"/>
    </g>`,

  dog: () => `
    <g stroke="#374151" stroke-width="2" stroke-linecap="round" fill="none">
      <ellipse cx="54" cy="60" rx="28" ry="18" fill="#fde68a"/>
      <circle cx="54" cy="40" r="16" fill="#fde68a" stroke="#374151"/>
      <!-- floppy ears -->
      <ellipse cx="38" cy="36" rx="8" ry="14" fill="#fbbf24" stroke="#374151" transform="rotate(-15,38,36)"/>
      <ellipse cx="70" cy="36" rx="8" ry="14" fill="#fbbf24" stroke="#374151" transform="rotate(15,70,36)"/>
      <!-- face -->
      <circle cx="48" cy="38" r="2.5" fill="#1f2937"/>
      <circle cx="60" cy="38" r="2.5" fill="#1f2937"/>
      <ellipse cx="54" cy="46" rx="7" ry="5" fill="#fca5a5" stroke="#374151"/>
      <path d="M50 46 Q54 50 58 46" stroke="#374151"/>
      <!-- tail -->
      <path d="M82 56 Q92 44 86 38" stroke="#fbbf24" stroke-width="5" fill="none"/>
    </g>`,

  car: () => `
    <g stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" fill="none">
      <rect x="14" y="50" width="80" height="28" rx="6" fill="#93c5fd" stroke="#1d4ed8"/>
      <path d="M26 50 Q32 30 44 28 L64 28 Q76 30 82 50" fill="#bfdbfe" stroke="#1d4ed8"/>
      <!-- windows -->
      <path d="M34 50 Q38 34 46 32 L62 32 Q70 34 74 50" fill="#e0f2fe" stroke="#0369a1"/>
      <line x1="54" y1="32" x2="54" y2="50"/>
      <!-- wheels -->
      <circle cx="30" cy="78" r="10" fill="#374151" stroke="#111827"/>
      <circle cx="30" cy="78" r="4" fill="#6b7280"/>
      <circle cx="78" cy="78" r="10" fill="#374151" stroke="#111827"/>
      <circle cx="78" cy="78" r="4" fill="#6b7280"/>
    </g>`,

  tree: () => `
    <g stroke="#14532d" stroke-width="2" stroke-linecap="round" fill="none">
      <rect x="48" y="64" width="12" height="22" fill="#92400e" stroke="#78350f"/>
      <circle cx="54" cy="42" r="26" fill="#4ade80" stroke="#16a34a"/>
      <circle cx="38" cy="52" r="18" fill="#4ade80" stroke="#16a34a"/>
      <circle cx="70" cy="52" r="18" fill="#4ade80" stroke="#16a34a"/>
      <circle cx="54" cy="28" r="16" fill="#86efac" stroke="#16a34a"/>
    </g>`,

  mountain: () => `
    <g stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <polygon points="54,14 16,82 92,82" fill="#94a3b8" stroke="#475569"/>
      <polygon points="54,14 38,46 70,46" fill="white" stroke="#94a3b8"/>
      <polygon points="74,32 54,82 94,82" fill="#64748b" stroke="#475569"/>
    </g>`,

  rain: () => `
    <g stroke-linecap="round">
      <rect x="20" y="16" width="68" height="28" rx="14" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      ${[[30,58],[44,66],[58,58],[72,66],[36,76],[50,84],[64,76]].map(([x,y]) =>
        `<line x1="${x}" y1="${y! - 10}" x2="${x! - 4}" y2="${y}" stroke="#60a5fa" stroke-width="2.5"/>`
      ).join('')}
    </g>`,

  happy: () => `
    <g stroke="#374151" stroke-width="2.5" stroke-linecap="round" fill="none">
      <circle cx="54" cy="50" r="34" fill="#fde68a" stroke="#d97706"/>
      <circle cx="42" cy="42" r="4" fill="#1f2937"/>
      <circle cx="66" cy="42" r="4" fill="#1f2937"/>
      <path d="M36 56 Q54 74 72 56" stroke="#d97706" stroke-width="3"/>
      <!-- rosy cheeks -->
      <circle cx="36" cy="56" r="7" fill="#fca5a5" opacity="0.5" stroke="none"/>
      <circle cx="72" cy="56" r="7" fill="#fca5a5" opacity="0.5" stroke="none"/>
    </g>`,

  sad: () => `
    <g stroke="#374151" stroke-width="2.5" stroke-linecap="round" fill="none">
      <circle cx="54" cy="50" r="34" fill="#bfdbfe" stroke="#1d4ed8"/>
      <circle cx="42" cy="42" r="4" fill="#1f2937"/>
      <circle cx="66" cy="42" r="4" fill="#1f2937"/>
      <path d="M36 66 Q54 52 72 66" stroke="#1d4ed8" stroke-width="3"/>
      <!-- tears -->
      <ellipse cx="40" cy="52" rx="2" ry="5" fill="#60a5fa" opacity="0.8" stroke="none"/>
      <ellipse cx="68" cy="52" rx="2" ry="5" fill="#60a5fa" opacity="0.8" stroke="none"/>
    </g>`,

  run: () => `
    <g stroke="#374151" stroke-width="2.5" stroke-linecap="round" fill="none">
      <circle cx="62" cy="22" r="10" fill="#fde68a" stroke="#374151"/>
      <!-- body tilted forward -->
      <line x1="62" y1="32" x2="50" y2="58"/>
      <!-- arms -->
      <line x1="58" y1="40" x2="40" y2="32"/>
      <line x1="56" y1="46" x2="70" y2="52"/>
      <!-- legs -->
      <line x1="50" y1="58" x2="30" y2="72"/>
      <line x1="50" y1="58" x2="64" y2="76"/>
      <!-- motion lines -->
      <line x1="20" y1="44" x2="32" y2="44" stroke="#94a3b8"/>
      <line x1="16" y1="52" x2="30" y2="52" stroke="#94a3b8"/>
    </g>`,

  sleep: () => `
    <g stroke-linecap="round">
      <circle cx="50" cy="56" r="30" fill="#c7d2fe" stroke="#4338ca" stroke-width="2.5" fill-opacity="0.6"/>
      <path d="M36 50 Q50 44 64 50" fill="none" stroke="#4338ca" stroke-width="2.5"/>
      <!-- z letters -->
      <text x="68" y="38" font-size="16" font-weight="bold" fill="#6366f1" font-family="sans-serif">z</text>
      <text x="76" y="26" font-size="20" font-weight="bold" fill="#4338ca" font-family="sans-serif">Z</text>
      <!-- closed eyes -->
      <path d="M40 50 Q44 46 48 50" fill="none" stroke="#374151" stroke-width="2"/>
      <path d="M54 50 Q58 46 62 50" fill="none" stroke="#374151" stroke-width="2"/>
    </g>`,

  phone: () => `
    <g stroke="#374151" stroke-width="2" fill="none">
      <rect x="36" y="16" width="36" height="72" rx="6" fill="#1e293b" stroke="#374151"/>
      <rect x="40" y="24" width="28" height="46" rx="2" fill="#38bdf8"/>
      <circle cx="54" cy="78" r="4" fill="#475569"/>
      <rect x="48" y="20" width="12" height="2" rx="1" fill="#475569"/>
      <!-- simple app grid on screen -->
      <circle cx="46" cy="34" r="4" fill="white" opacity="0.6"/>
      <circle cx="54" cy="34" r="4" fill="white" opacity="0.6"/>
      <circle cx="62" cy="34" r="4" fill="white" opacity="0.6"/>
      <circle cx="46" cy="44" r="4" fill="white" opacity="0.6"/>
      <circle cx="54" cy="44" r="4" fill="white" opacity="0.6"/>
      <circle cx="62" cy="44" r="4" fill="white" opacity="0.6"/>
    </g>`,

  money: () => `
    <g stroke="#374151" stroke-width="2" stroke-linecap="round" fill="none">
      <ellipse cx="54" cy="58" rx="36" ry="20" fill="#fef9c3" stroke="#92400e"/>
      <ellipse cx="54" cy="52" rx="36" ry="20" fill="#fef08a" stroke="#92400e"/>
      <ellipse cx="54" cy="46" rx="36" ry="20" fill="#fde047" stroke="#92400e"/>
      <circle cx="54" cy="46" r="12" fill="#fbbf24" stroke="#92400e"/>
      <text x="54" y="51" text-anchor="middle" font-size="14" font-weight="bold" fill="#92400e" font-family="sans-serif">$</text>
    </g>`,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns a full <svg> string for a given word/concept. */
export function getSketch(word: string): string {
  const key = word.toLowerCase().trim();

  // 1. Custom SVG sketch
  const customRenderer = findBestMatch(key, SKETCH_MAP);
  if (customRenderer) {
    return wrapSvg(customRenderer());
  }

  // 2. Emoji match
  const emoji = findBestMatch(key, EMOJI_MAP);
  if (emoji) {
    return emojiSvg(emoji);
  }

  // 3. Letter badge fallback
  return letterSvg(key);
}

/** True if we have a sketch or emoji for this word. */
export function hasSketch(word: string): boolean {
  const key = word.toLowerCase().trim();
  return (
    findBestMatch(key, SKETCH_MAP) !== undefined ||
    findBestMatch(key, EMOJI_MAP) !== undefined
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findBestMatch<T>(key: string, map: Record<string, T>): T | undefined {
  // Exact match
  if (map[key]) return map[key];
  // Partial: any map key that is contained in the search key (e.g. "good morning" -> "morning")
  for (const mapKey of Object.keys(map)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return map[mapKey];
  }
  return undefined;
}

function wrapSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" role="img">
  <rect width="108" height="108" rx="16" fill="#f8fafc"/>
  ${inner}
</svg>`;
}

function emojiSvg(emoji: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" role="img">
  <rect width="108" height="108" rx="16" fill="#f8fafc"/>
  <text x="54" y="72" text-anchor="middle" font-size="56" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
</svg>`;
}

function letterSvg(word: string): string {
  const letter = word[0]?.toUpperCase() ?? "?";
  // Deterministic pastel color based on char code
  const hues = [210, 160, 280, 30, 340, 60, 190];
  const hue = hues[(word.charCodeAt(0) ?? 0) % hues.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" role="img">
  <rect width="108" height="108" rx="16" fill="hsl(${hue},80%,94%)"/>
  <circle cx="54" cy="54" r="36" fill="hsl(${hue},70%,84%)" stroke="hsl(${hue},60%,70%)" stroke-width="2"/>
  <text x="54" y="66" text-anchor="middle" font-size="44" font-weight="700"
        font-family="Inter, system-ui, sans-serif" fill="hsl(${hue},50%,30%)">${letter}</text>
</svg>`;
}
