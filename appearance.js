export const FEATURES = {
  eyes: { label: 'Глаза', options: ['Открытые', 'Миндальные', 'Круглые', 'Спокойные', 'Лукавые', 'Широкие', 'Узкие', 'Задумчивые', 'Искристые', 'Добрые'] },
  nose: { label: 'Нос', options: ['Пуговка', 'Прямой', 'Курносый', 'Широкий', 'Тонкий', 'С горбинкой', 'Плоский', 'Капля', 'Гранёный', 'Мягкий'] },
  mouth: { label: 'Рот', options: ['Нейтральный', 'Улыбка', 'Широкая улыбка', 'Полуулыбка', 'Мягкий', 'Спокойные губы', 'Решительный', 'Озорной', 'Сдержанный', 'Открытая улыбка'] },
  ears: { label: 'Уши', options: ['Компактные', 'Округлые', 'Овальные', 'Узкие', 'Широкие', 'Прижатые', 'Оттопыренные', 'С мочкой', 'Мягкий кончик', 'Гранёные'] },
  hair: { label: 'Причёска', options: ['Короткие волны', 'Боковой пробор', 'Зачёс назад', 'Взъерошенные', 'Кудри', 'Каре', 'Пикси', 'Хвост', 'Вертикальная стрижка', 'Бейсболка'] },
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
export const DEFAULT_APPEARANCE = Object.freeze({ eyes: 0, nose: 0, mouth: 1, ears: 0, hair: 1, palette: 0 });
export const APPEARANCE_KEY = 'kub.appearance.v1';
export function normalizeAppearance(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_APPEARANCE).map(([key, fallback]) =>
    [key, Number.isInteger(source[key]) && source[key] >= 0 && source[key] < 10 ? source[key] : fallback]));
}
export function loadAppearance() {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY))); }
  catch { return { ...DEFAULT_APPEARANCE }; }
}
export function saveAppearance(value) {
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(normalizeAppearance(value))); return true; }
  catch { return false; }
}
export function randomAppearance(random = Math.random) {
  return Object.fromEntries(Object.keys(DEFAULT_APPEARANCE).map(key => [key, Math.min(9, Math.floor(random() * 10))]));
}
