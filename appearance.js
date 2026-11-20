// Model numbers also identify hairstyles in older saved appearances.
export const HAIRSTYLES = [
  {id:'explorer-waves', name:'Короткие волны', model:0, owner:'explorer'},
  {id:'side-part', name:'Боковой пробор', model:1},
  {id:'brushed-back', name:'Зачёс назад', model:2},
  {id:'tousled', name:'Взъерошенные', model:3},
  {id:'curls', name:'Кудри', model:4},
  {id:'bob', name:'Каре', model:5},
  {id:'pixie', name:'Пикси', model:6},
  {id:'ponytail', name:'Хвост', model:7},
  {id:'upright', name:'Вертикальная стрижка', model:8},
  {id:'baseball-cap', name:'Бейсболка', model:9},
];
export const EXPLORER = {
  id:'explorer', nativeHair:'explorer-waves',
  sharedHair:HAIRSTYLES.filter(style => !style.owner).map(style => style.id),
};

export function hairstylesFor(profile) {
  const native = HAIRSTYLES.find(style => style.id === profile.nativeHair && (!style.owner || style.owner === profile.id));
  const shared = HAIRSTYLES.filter(style => !style.owner && style !== native && profile.sharedHair.includes(style.id));
  return native ? [native, ...shared] : shared;
}

export const FEATURES = {
  eyes: { label: 'Глаза', options: ['Открытые', 'Миндальные', 'Круглые', 'Спокойные', 'Улыбчивые', 'Широкие', 'Узкие', 'Задумчивые', 'Искристые', 'Добрые'] },
  nose: { label: 'Нос', options: ['Пуговка', 'Прямой', 'Курносый', 'Широкий', 'Тонкий', 'С горбинкой', 'Плоский', 'Капля', 'Гранёный', 'Мягкий'] },
  mouth: { label: 'Рот', options: ['Нейтральный', 'Улыбка', 'Широкая улыбка', 'Полуулыбка', 'Мягкий', 'Спокойные губы', 'Решительный', 'Озорной', 'Сдержанный', 'Открытая улыбка'] },
  ears: { label: 'Уши', options: ['Компактные', 'Округлые', 'Овальные', 'Узкие', 'Широкие', 'Прижатые', 'Оттопыренные', 'С мочкой', 'Мягкий кончик', 'Гранёные'] },
  hair: { label: 'Причёска', options: HAIRSTYLES.map(style => style.name) },
};
export const SPARKLING_EYES_INDEX = 8;
export const EYE_COLORS = [
  {name:'Карий', color:0x62402b},
  {name:'Зелёный', color:0x486e62},
  {name:'Голубой', color:0x5e8295},
  {name:'Янтарный', color:0xbe8737},
  {name:'Серый', color:0x79818d},
];

// Radii relative to the white of the round-eye preset.
export const ROUND_EYES = { index: 2, iris: .64, pupil: .31 };

// The thumbnail and the face mesh use the same closed eyelid silhouette (Y up).
export const SMILING_EYES_INDEX = 4;
export const SMILING_LID = {
  start: [-11, -2],
  curves: [
    [-8, 9, 8, 9, 11, -2],
    [11.4, -3.5, 10, -4, 9, -2.7],
    [4, 3.5, -4, 3.5, -9, -2.7],
    [-10, -4, -11.4, -3.5, -11, -2],
  ],
};
export const PALETTES = [
  { name: 'Каштан', colors: [0x79543e, 0xb48660, 0x49362d] },
  { name: 'Шоколад', colors: [0x48372f, 0x80614b, 0x2a2425] },
  { name: 'Песочный блонд', colors: [0xc5a574, 0xf0d6a0, 0x8b7251] },
  { name: 'Медь', colors: [0xb36b45, 0xe7a46e, 0x744437] },
  { name: 'Графит', colors: [0x343c49, 0x687382, 0x202733] },
  { name: 'Серебро', colors: [0xb6c3cb, 0xe7edef, 0x788b9d] },
  { name: 'Слива', colors: [0x78566f, 0xbc88a1, 0x47354f] },
  { name: 'Морская волна', colors: [0x477e7b, 0x85bab0, 0x2c4e59] },
  { name: 'Розовый кварц', colors: [0xc18d9a, 0xf1bec3, 0x845f77] },
  { name: 'Лунный синий', colors: [0x617ca8, 0xa7b9d8, 0x3e496d] },
];
export const DEFAULT_APPEARANCE = Object.freeze({ eyes: 0, eyeColor: 0, nose: 0, mouth: 1, ears: 0, hair: hairstylesFor(EXPLORER)[0].model, palette: 0 });
export const APPEARANCE_KEY = 'kub.appearance.v1';
export function normalizeAppearance(value, profile = EXPLORER) {
  const source = value && typeof value === 'object' ? value : {};
  const result = { ...DEFAULT_APPEARANCE };
  for (const key of Object.keys(result)) {
    if (key === 'hair') continue;
    const limit = key === 'eyeColor' ? EYE_COLORS.length : 10;
    if (Number.isInteger(source[key]) && source[key] >= 0 && source[key] < limit) result[key] = source[key];
  }
  const styles = hairstylesFor(profile);
  const chosen = styles.find(style => style.id === source.hair || style.model === source.hair);
  result.hair = (chosen ?? styles[0])?.model ?? null;
  // Old saves used brown for open eyes, blue for sparkling eyes and green otherwise.
  if (source.eyeColor === undefined && result.eyes !== 0) {
    result.eyeColor = result.eyes === SPARKLING_EYES_INDEX ? 2 : 1;
  }
  return result;
}
function appearanceKey(profile) {
  return profile.id === EXPLORER.id ? APPEARANCE_KEY : APPEARANCE_KEY + '.' + profile.id;
}
export function loadAppearance(profile = EXPLORER) {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(appearanceKey(profile))), profile); }
  catch { return normalizeAppearance(null, profile); }
}
export function saveAppearance(value, profile = EXPLORER) {
  const look = normalizeAppearance(value, profile);
  const style = HAIRSTYLES.find(item => item.model === look.hair);
  try {
    localStorage.setItem(appearanceKey(profile), JSON.stringify({...look, hair:style?.id ?? null}));
    return true;
  } catch { return false; }
}
export function randomAppearance(random = Math.random, profile = EXPLORER) {
  const styles = hairstylesFor(profile);
  return Object.fromEntries(Object.keys(DEFAULT_APPEARANCE).map(key => {
    const count = key === 'hair' ? styles.length : key === 'eyeColor' ? EYE_COLORS.length : 10;
    const index = Math.min(count - 1, Math.floor(random() * count));
    return [key, key === 'hair' ? styles[index]?.model ?? null : index];
  }));
}
