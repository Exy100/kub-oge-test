// Legacy reward ID retained for saved bag layouts.
export const WEAPON_KIT = 'reward.weapon-kit';
export const STAFF_ID = 'weapon.pulse-staff';
export const pulseStaff = {
  id: STAFF_ID, type: 'weapon', kind: 'weapon', category: 'Оружие', glyph: 'ϟ',
  name: 'Импульсный посох',
  description: 'Выпускает направленный импульс. Когда сапфир целиком наполнится светом, посох готов к выстрелу.',
};
export const STAFF_ATTACK = Object.freeze({ windup: .18, impact: .42, effectEnd: 1.5, interval: 1.8, range: 8, damage: 2 });
export const STAFF_SOUNDS = Object.freeze({
  launch: 'twin-vein-launch.wav',
  impacts: Object.freeze(['twin-vein-discharge.wav', 'twin-vein-discharge-2.wav', 'twin-vein-discharge-3.wav']),
});
