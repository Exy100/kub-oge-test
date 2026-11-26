export default {
  id: 'island.discovery-garden', name: 'Сад открытий', center: 120,
  quest: { title: 'Сад открытий', action: 'Исследуй новую локацию', goal: 'Врата открыты',
    brief: 'Исследуй Сад открытий.',
    tip: 'Зелёный портал возвращает на Остров трёх арок.' },
  trees: [[112,-6,1.2],[128,-5,1],[114,4,.8],[126,1,1]]
    .map(([x,z,scale]) => ({ objectId: 'tree.classic', x, z, scale })),
};
