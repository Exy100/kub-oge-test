import * as THREE from '../vendor/three.module.js';
import {scanCell, prepareFindingPreview, claimFinding, moscowDay} from './explorer-scan.js';
import {createScanFindings} from '../world/scan-findings.js';

const messages = {
  repeat:'Эта клетка уже просканирована.',
  empty:'Клетка пуста.',
  coin:'Найдена золотая монета. Подбери её левой кнопкой мыши.',
  tablet:'Найдена каменная табличка. Нажми E, чтобы открыть её.',
};

export function createScanInteraction({location, island, solids, obstacles, stage, camera, player, store,
  dialog, progress, say, notify, pause, onCoin}) {
  const cells = new Set(), trunks = new Map();
  const treeLocation = location.id + '/trees';
  // Capture the permanent terrain before player buildings and loose pickups are restored.
  for (const tile of island.children) {
    if (tile.userData.treeKey && tile.name.endsWith('-trunk')) trunks.set(tile.userData.treeKey, tile);
    if (!location.scanSurface || tile.userData.scanSurface !== location.scanSurface) continue;
    const {x,z} = tile.position;
    if (!solids.some(m => Math.abs(x-m.position.x) < .32+m.scale.x/2 &&
        Math.abs(z-m.position.z) < .32+m.scale.z/2)) cells.add(x+','+z);
  }
  const view = createScanFindings(island,trunks);
  const ray = new THREE.Raycaster(), center = new THREE.Vector2(), point = new THREE.Vector3();
  const floor = new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let disposed = false;
  let pending = null, opened = null, day = store.state.day;
  let revision = store.state.scanRevision ?? 0;
  let showingPrizes = false;
  function cancel() {
    pending = null;
    view.stop();
    progress.hidden = true;
  }
  function sync(save) {
    if (day !== save.day || revision !== (save.scanRevision ?? 0)) {
      cancel();
      showingPrizes = false;
    }
    day = save.day;
    revision = save.scanRevision ?? 0;
    const grass = save.locations[location.id], trees = save.locations[treeLocation];
    const preview = showingPrizes ? {...grass?.hiddenPrizes,...trees?.hiddenPrizes} : {};
    view.sync({...preview,...grass?.cells,...trees?.cells});
    if (opened && (opened.day !== day || opened.revision !== revision || !view.markers.has(opened.key))) dialog.close();
  }
  function target(allowTreeHit) {
    camera.updateMatrixWorld();
    ray.setFromCamera(center,camera);
    const obstruction = ray.intersectObjects([...solids,...obstacles.filter(m=>m.visible),...stage.pickups,...stage.ghosts.filter(m=>m.visible)],false)[0];
    const marker = ray.intersectObjects([...view.markers.values()], false)[0];
    if (marker && marker.distance < (obstruction?.distance ?? Infinity) && marker.point.distanceTo(player.position)<6) {
      return marker.object.userData.scanKey;
    }
    if (allowTreeHit && obstruction?.object.userData.treeKey && obstruction.point.distanceTo(player.position)<6)
      return obstruction.object.userData.treeKey;
    if (!ray.ray.intersectPlane(floor,point) || point.distanceTo(player.position)>=6 ||
        (obstruction && obstruction.distance < ray.ray.origin.distanceTo(point))) return null;
    const key = Math.round(point.x)+','+Math.round(point.z);
    return cells.has(key) ? key : null;
  }
  const ref = key => ({location:trunks.has(key) ? treeLocation : location.id, day:moscowDay(), revision, key});
  function start(skill) {
    if (pending) return;
    if (day !== moscowDay()) store.refresh();
    const key = target(true), tree = skill === 'tree';
    if (!(tree ? trunks : cells).has(key)) {
      notify(tree ? 'Наведи прицел на дерево поблизости.' : 'Наведи прицел на свободную клетку травы поблизости.');
      return;
    }
    const finding = ref(key);
    if (store.state.locations[finding.location]?.cells[key]) {
      say(tree ? 'Это дерево уже просканировано.' : messages.repeat);
      return;
    }
    const trunk = trunks.get(key);
    const [x,z] = tree ? [trunk.position.x,trunk.position.z] : key.split(',').map(Number);
    const face = tree ? Math.round(Math.atan2(player.position.x-x,player.position.z-z)/(Math.PI/2)) : undefined;
    pending = {...finding, skill, face, x,z,start:performance.now()};
    progress.hidden = false;
    progress.value = 0;
  }
  function update(now, active, reduced) {
    if (day !== moscowDay()) store.refresh();
    if (!pending) return;
    if (!active || Math.hypot(player.position.x-pending.x,player.position.z-pending.z)>=6) {cancel();return}
    const fraction = Math.min(1,(now-pending.start)/3000);
    progress.value = fraction;
    if (pending.skill === 'tree') view.pulseTree(trunks.get(pending.key),fraction,reduced);
    else view.pulse(pending.x,pending.z,fraction,reduced);
    if (fraction < 1) return;
    const scan = pending;
    cancel();
    store.change(save => scanCell(save,{...scan,cells:scan.skill === 'tree' ? trunks : cells})).then(result => {
      if (!result || disposed || scan.day!==moscowDay() || scan.revision!==revision) return;
      if (scan.skill === 'tree' && result === 'empty') say('В этом дереве находок нет.');
      else if (scan.skill === 'tree' && result === 'repeat') say('Это дерево уже просканировано.');
      else say(messages[result]);
    });
  }
  function interact(action) {
    const key = target(), marker = view.markers.get(key);
    if (!marker) return false;
    const finding = ref(key);
    if (day !== finding.day) {store.refresh();return true}
    if (!store.state.locations[finding.location]?.cells[key]) {
      notify(trunks.has(key) ? 'Сначала просканируй дерево с призом.' : 'Сначала просканируй клетку с призом.');
      return true;
    }
    if (marker.userData.kind === 'coin' && action === 'collect') {
      store.change(save => claimFinding(save,finding,'coin')).then(reward => {
        if (reward) onCoin();
      });
    } else if (marker.userData.kind === 'tablet' && action === 'open') {
      opened = finding;
      cancel();
      pause();
      dialog.showModal();
    } else {
      notify(marker.userData.kind === 'tablet' ? 'E · Открыть табличку' : 'ЛКМ · Подобрать монету',2000);
    }
    return true;
  }
  function close(){opened=null}
  dialog.addEventListener('close',close);
  sync(store.state);
  return {
    start, update, sync, interact, cancel,
    get showingPrizes(){return showingPrizes},
    async setShowingPrizes(visible) {
      store.refresh();
      showingPrizes = visible;
      const cycle = {day, revision};
      if (visible) await store.change(save => {
        prepareFindingPreview(save, {location:location.id, ...cycle, cells});
        prepareFindingPreview(save, {location:treeLocation, ...cycle, cells:trunks, skill:'tree'});
      });
      else sync(store.state);
    },
    // The future Excel answer checker calls this only with its verification result.
    submitVerifiedAnswer(correct) {
      if (!dialog.open || !opened || correct !== true) return Promise.resolve(0);
      const finding = opened;
      return store.change(save => claimFinding(save,finding,'tablet',correct));
    },
    dispose(){
      disposed = true;
      cancel();
      if (dialog.open) dialog.close();
      dialog.removeEventListener('close',close);
      view.dispose();
    },
  };
}
