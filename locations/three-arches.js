export default {
  id: 'island.three-arches', name: 'Остров трёх арок', center: 40,
  quest: { title: 'Остров трёх арок', action: 'Собери песчаник, дерево и камень', goal: 'Построй три арки',
    brief: 'Построй три арки из песчаника, дерева и камня.',
    tip: 'Выбирай материал клавишами 1, 3 и 4.' },
  trees: [[32,-7,1],[48,-6,1.2],[32,6,.9],[48,7,1]]
    .map(([x,z,scale]) => ({ objectId: 'tree.classic', x, z, scale })),
};
