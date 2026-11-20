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
  const cells = new Set();
  // Capture the permanent terrain before player buildings and loose pickups are restored.
  for (const tile of island.children) {
    if (tile.userData.scanSurface !== location.scanSurface) continue;
    const {x,z} = tile.position;
    if (!solids.some(m => Math.abs(x-m.position.x) < .32+m.scale.x/2 &&
        Math.abs(z-m.position.z) < .32+m.scale.z/2)) cells.add(x+','+z);
  }
  const view = createScanFindings(island);
  const ray = new THREE.Raycaster(), center = new THREE.Vector2(), point = new THREE.Vector3();
  const floor = new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let pending = null, opened = null, day = store.state.day;
  let showingPrizes = false;
  function cancel() {
    pending = null;
    view.stop();
    progress.hidden = true;
  }
  function sync(save) {
    if (day !== save.day) {
      cancel();
      showingPrizes = false;
    }
    day = save.day;
    const findings = save.locations[location.id];
    view.sync(showingPrizes ? {...findings?.hiddenPrizes, ...findings?.cells} : findings?.cells ?? {});
    if (opened && (opened.day !== day || !view.markers.has(opened.key))) dialog.close();
  }
  function target() {
    camera.updateMatrixWorld();
    ray.setFromCamera(center,camera);
    const obstruction = ray.intersectObjects([...solids,...obstacles.filter(m=>m.visible),...stage.pickups],false)[0];
    const marker = ray.intersectObjects([...view.markers.values()], false)[0];
    if (marker && marker.distance < (obstruction?.distance ?? Infinity) && marker.point.distanceTo(player.position)<6) {
      return marker.object.userData.scanKey;
    }
    if (!ray.ray.intersectPlane(floor,point) || point.distanceTo(player.position)>=6 ||
        (obstruction && obstruction.distance < ray.ray.origin.distanceTo(point))) return null;
    const key = Math.round(point.x)+','+Math.round(point.z);
    return cells.has(key) ? key : null;
  }
  const ref = key => ({location:location.id, day:moscowDay(), key});
  function start() {
    if (pending) return;
    if (day !== moscowDay()) store.refresh();
    const key = target();
    if (!key) {notify('Наведи прицел на свободную клетку травы поблизости.');return}
    if (store.state.locations[location.id]?.cells[key]) {say(messages.repeat);return}
    const [x,z] = key.split(',').map(Number);
    pending = {...ref(key), x,z,start:performance.now()};
    progress.hidden = false;
    progress.value = 0;
  }
  function update(now, active, reduced) {
    if (day !== moscowDay()) store.refresh();
    if (!pending) return;
    if (!active || Math.hypot(player.position.x-pending.x,player.position.z-pending.z)>=6) {cancel();return}
    const fraction = Math.min(1,(now-pending.start)/3000);
    progress.value = fraction;
    view.pulse(pending.x,pending.z,fraction,reduced);
    if (fraction < 1) return;
    const scan = pending;
    cancel();
    store.change(save => scanCell(save,{...scan,cells})).then(result => {
      if (result && island.name===location.id && scan.day===moscowDay()) say(messages[result]);
    });
  }
  function interact(action) {
    const key = target(), marker = view.markers.get(key);
    if (!marker) return false;
    const finding = ref(key);
    if (day !== finding.day) {store.refresh();return true}
    if (!store.state.locations[location.id]?.cells[key]) {
      notify('Сначала просканируй клетку с призом.');
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
      if (visible) await store.change(save => prepareFindingPreview(save, {location:location.id, day, cells}));
      else sync(store.state);
    },
    // The future Excel answer checker calls this only with its verification result.
    submitVerifiedAnswer(correct) {
      if (!dialog.open || !opened || correct !== true) return Promise.resolve(0);
      const finding = opened;
      return store.change(save => claimFinding(save,finding,'tablet',correct));
    },
    dispose(){
      cancel();
      if (dialog.open) dialog.close();
      dialog.removeEventListener('close',close);
      view.dispose();
    },
  };
}
