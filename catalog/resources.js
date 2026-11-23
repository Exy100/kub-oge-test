// Keep these IDs and material slots stable: inventory and construction use them.
export const resources = [
  { id: 'material-0', name: 'Песчаник', description: 'Золотистый строительный куб для арок и других построек.', materialSlot: 0, color: 0xd8bb7b },
  { id: 'material-1', name: 'Трава', description: 'Зелёный куб для свободного строительства.', materialSlot: 1, color: 0x89aa5d },
  { id: 'material-2', name: 'Дерево', description: 'Деревянный строительный куб. Нужен для деревянных арок.', materialSlot: 2, color: 0xa47b52 },
  { id: 'material-3', name: 'Камень', description: 'Серый строительный куб. Используется в одной из трёх арок.', materialSlot: 3, color: 0xa3aba4 },
  { id: 'material-4', name: 'Розовый куб', description: 'Розовый декоративный куб для свободного строительства.', materialSlot: 4, color: 0xc58f96 },
  { id: 'material-5', name: 'Голубой куб', description: 'Голубой декоративный куб для свободного строительства.', materialSlot: 5, color: 0x80b4c1 },
].map(resource => ({ type: 'resource', kind: 'resource', category: 'Материал', glyph: '◆', ...resource }));

resources.push(
  { id: 'bit', type: 'resource', kind: 'resource', name: 'Бит', category: 'Ресурс', glyph: '01',
    description: 'Хранит одно двоичное значение: 0 или 1. Восемь битов составляют один байт.' },
  { id: 'byte', type: 'resource', kind: 'resource', name: 'Байт', category: 'Ресурс', glyph: '▣',
    description: 'Создаётся из восьми битов в кузнице. Четыре байта на площадке открывают врата.' },
);
