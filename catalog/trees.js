// Parts: [x, y, z, width, height, depth, paletteIndex, collision, meshName].
// Geometry is data; the shared voxel-tree renderer lives in world/trees.js.
export const trees = [
  {
    id: 'tree.island', type: 'tree', name: 'Дерево первого острова',
    description: 'Блочное дерево с объёмной ступенчатой кроной и короткой веткой под листвой.',
    palette: [0x8d6b44, 0x9b7950, 0x608646, 0x72994f, 0x7ca456, 0x85ac5e],
    parts: [
      [0,1.25,0,.6,2.5,.6,0,true,'island-tree-trunk'],
      [.38,2.32,.12,.9,.24,.34,1,false,'island-tree-fork'],
      [0,3.05,0,2.1,1.6,2.05,2,false,'island-tree-foliage'],
      [-.85,2.85,.12,1.25,1.1,1.5,3,false,'island-tree-foliage'],
      [.8,3.08,.35,1.15,1.25,1.5,4,false,'island-tree-foliage'],
      [-.15,3.3,-.85,1.6,1.3,1.05,3,false,'island-tree-foliage'],
      [-.25,4,-.12,1.65,1,1.5,4,false,'island-tree-foliage'],
      [.1,3.65,.8,1.3,.9,1,5,false,'island-tree-foliage'],
    ],
  },
  {
    id: 'tree.classic', type: 'tree', name: 'Островное дерево',
    description: 'Дерево с прямым стволом и тремя крупными блоками зелёной кроны.',
    palette: [0x8d6b44, 0x668d49, 0x7ca456, 0x85ac5e],
    parts: [
      [0,1.25,0,.6,2.5,.6,0,true,'tree-trunk'],
      [0,3,0,2.7,1.6,2.6,1,false,'tree-foliage'],
      [-.3,4,0,2,1,1.9,2,false,'tree-foliage'],
      [.5,3.2,.5,1.5,1.3,1.7,3,false,'tree-foliage'],
    ],
  },
];
