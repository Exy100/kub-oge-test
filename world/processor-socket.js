import { addScrewHeads, buildProcessorCooler } from './processor-cooler.js';
import { PLAYER_HEIGHT } from '../physics.js';

export function buildProcessorSocket(box, center) {
  const x = center - .55, z = -2.55;
  const span = 3 * PLAYER_HEIGHT;
  const socket = span + .94;
  const foot = .24;
  box(x,foot/2,z,socket,foot,socket,0x263b38,true);
  // Package substrate, heat spreader and closed retainer, all parallel to the PCB.
  box(x,foot+.15,z,span,.30,span,0x376d5b,true);
  const core = box(x,foot+.675,z,span-.78,.75,span-.78,0xa6aeaa,true);
  const rotors = buildProcessorCooler(box,x,z,foot+1.05);
  const seatOffset=socket/2-.22;
  const socketScrews=[];
  for(const dx of [-1,1]) for(const dz of [-1,1]){
    socketScrews.push([x+dx*seatOffset,foot+.030,z+dz*seatOffset,-Math.PI/2,0,dx*.36,1.18]);
  }
  addScrewHeads(core.parent,socketScrews);
  for (const side of [-1,1]) {
    box(x+side*(span/2-.08),.49,z,.32,.32,span+.16,0x819091,true);
    box(x,.49,z+side*(span/2-.08),span-.48,.32,.32,0x819091,true);
  }
  // Hinged load plate with a lever latched down the right side.
  box(x,.59,z-span/2,2.7,.32,.34,0x667572,true);
  box(x+span/2+.22,.44,z,.10,.12,span+.38,0xc0b9a3,true);
  box(x+span/2-.08,.44,z+span/2+.14,.69,.12,.14,0xc0b9a3,true);
  box(x+span/2-.35,.44,z+span/2+.14,.32,.20,.22,0x394541,true);
  const lights = [-.38,0,.38].map(dx=>
    box(x+dx,.29,z+socket/2-.19,.23,.08,.14,0xd78a53));
  return {core,lights,rotors};
}
