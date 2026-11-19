export default {
  id: 'island.data-forge', name: 'Кузница данных', center: 80,
  quest: { title: 'Кузница байтов', action: 'Собери биты и создай байты', goal: 'Выложи байты у арки',
    tip: 'E у верстака открывает кузницу. ЛКМ на площадке справа от арки устанавливает байт.' },
  trees: [[72,-7,.8],[88,-7,1]]
    .map(([x,z,scale]) => ({ objectId: 'tree.classic', x, z, scale })),
};
