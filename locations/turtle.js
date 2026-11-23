export default {
  id:'island.turtle', name:'Мастерская черепахи', center:160,
  quest:{title:'Мастерская черепахи', action:'Поговори с черепахой у верстака.', goal:'Детали в компьютере',
    brief:'Поговори с черепахой у верстака.', tip:'Подойди к черепахе и нажми E.'},
  trees:[[-8,-7,1.1],[8,-6,1.2],[-8,6,.95],[9,3,.8]].map(([x,z,scale])=>({objectId:'tree.island',x:160+x,z,scale})),
};
