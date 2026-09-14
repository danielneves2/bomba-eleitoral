// Three deliberate shots in three seconds. Coordinates are relative to the
// invader's focus, so cameras stay attached to the moving airplane.
export function arrivalCamera(kind, progress, focus, reduced = false) {
  const t = Math.max(0, Math.min(1, progress));
  const shot = reduced ? 0 : t < .34 ? 0 : t < .67 ? 1 : 2;
  const launch = Math.max(0, (t - .64) / .36);
  if(kind==='trump') {
    const ease=reduced?0:t*t*(3-2*t);
    // Continuous centered dolly: no cut can push the small sprite off screen.
    return {position:{x:focus.x+(reduced?0:Math.sin(t*Math.PI)*.7),y:focus.y+1.5-ease*.5,z:focus.z+11-ease*3},target:{x:focus.x,y:focus.y,z:focus.z},fov:58-ease*4,shot};
  }
  const shots = {
    bukele: [
      {eye:[0,4,15],aim:[0,0,-2],fov:60},
      {eye:[2,1.2,8],aim:[0,.3,1],fov:54},
      {eye:[0,.5,6],aim:[0,.25,1],fov:50},
    ],
    putin: [
      { eye: [7, 4, 12], aim: [0, .4, 0], fov: 58 },
      { eye: [2.3, 1.2, 4.8], aim: [.4, .8, -.1], fov: 48 },
      { eye: [-8, 2.8, 10], aim: [1, .1, 0], fov: 62 },
    ],
    trump: [
      { eye: [3, 2, 11], aim: [0, .1, 0], fov: 62 },
      { eye: [.6, .2, 5.5], aim: [.5, -.35, 0], fov: 48 },
      { eye: [-4, 2.8, 10], aim: [0, .7, 0], fov: 60 },
    ],
    kim: [
      { eye: [5, 3.5, 15], aim: [0, .4, 0], fov: 62 },
      { eye: [-5, .6, 9], aim: [-1.8, -1.1, .3], fov: 58 },
      { eye: [7, 4 + launch * launch * 9, 17], aim: [1, launch * launch * 9, -launch * 3], fov: 65 },
    ],
  };
  const selected = shots[kind]?.[shot] || shots.putin[0];
  const eye = selected.eye.slice(), aim = selected.aim.slice();
  // Reduced motion gets a single fixed wide composition, no cuts or tracking pan.
  if (reduced && kind === 'kim') { eye[1] = 7; eye[2] = 24; aim[1] = 4; }
  return {
    position: { x: focus.x + eye[0], y: focus.y + eye[1], z: focus.z + eye[2] },
    target: { x: focus.x + aim[0], y: focus.y + aim[1], z: focus.z + aim[2] },
    fov: selected.fov, shot,
  };
}
