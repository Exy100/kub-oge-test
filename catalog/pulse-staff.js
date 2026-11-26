export const WEAPON_KIT = 'reward.weapon-kit';
export const STAFF_ID = 'weapon.pulse-staff';
export const pulseStaff = {
  id: STAFF_ID, type: 'weapon', kind: 'weapon', category: 'Оружие', glyph: 'ϟ',
  name: 'Импульсный посох',
  description: 'Выпускает направленный импульс. Когда все три синих окна заполнены, посох готов к выстрелу.',
};
export const STAFF_ATTACK = Object.freeze({ windup: .18, interval: .8, range: 8, damage: 2 });
