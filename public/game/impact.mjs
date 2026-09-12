export function circleCells(map, x, z, radius) {
  const cells = [];
  for (let iz = Math.max(1, Math.floor(z - radius)); iz <= Math.min(map.length - 2, Math.ceil(z + radius)); iz++)
    for (let ix = Math.max(1, Math.floor(x - radius)); ix <= Math.min(map[iz].length - 2, Math.ceil(x + radius)); ix++)
      if (Math.hypot(ix - x, iz - z) <= radius && map[iz][ix] !== 1 && map[iz][ix] !== 3) cells.push([ix, iz]);
  return cells;
}

// Instant circular airburst, distinct from a bomb's cross-shaped lingering fire.
export function radialImpact(game, x, z, radius, kind) {
  const cells = circleCells(game.map, x, z, radius);
  for (const [cx, cz] of cells) if (game.map[cz][cx] === 2) {
    game.map[cz][cx] = 0;
    game.events.push({ type: 'crate', x: cx, z: cz });
  }
  for (const actor of [game.player, ...game.enemies]) {
    const distance = Math.hypot(actor.x - x, actor.z - z);
    if (actor.hp <= 0 || distance > radius) continue;
    const amount = distance < .65 ? 2 : 1;
    if (actor === game.player) game.hurtPlayer(amount);
    else game.hurtEnemy(actor, 'invader', amount);
  }
  game.events.push({ type: 'explode', style: kind, x, z, y: .3, cells, radius });
  game.invasion.impacts.push({ id: ++game.serial, x, z, radius, life: .6 });
  for (const bomb of game.bombs.slice()) if (Math.hypot(bomb.x - x, bomb.z - z) <= radius) game.explode(bomb);
}

export function clearSight(game, from, to) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) * 5);
  for (let i = 1; i < steps; i++) if (game.solid(from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps)) return false;
  return true;
}
