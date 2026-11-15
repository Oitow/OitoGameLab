// Static meshes are emitted once into the host's world batches. Seeds belong to
// individual assets so their silhouettes are independent of generation order.
globalThis.ErlenArt = (() => {
  const tau = Math.PI * 2;
  function stream(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function foliage(x, y, z, radius, height, sides, angle, color, random, hanging) {
    const shoulder = [], skirt = [];
    const crown = [x + radius * .12, y + height, z - radius * .09];
    const base = [x, y + height * .13, z];
    for (let i = 0; i < sides; i++) {
      const a = angle + tau * i / sides, dx = Math.cos(a), dz = Math.sin(a);
      const r = radius * (.83 + random() * .25);
      shoulder.push([x + dx * r * .62, y + height * (.52 + random() * .13), z + dz * r * .62]);
      skirt.push([x + dx * r, y + height * ((i % 2 ? .08 : -.08) * hanging), z + dz * r]);
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      tri(shoulder[i], crown, shoulder[j], color, 1.09);
      tri(skirt[i], shoulder[i], shoulder[j], color);
      tri(skirt[i], shoulder[j], skirt[j], color, .96);
      tri(skirt[i], skirt[j], base, color, .84);
    }
  }

  function drawTree(x, z, height, variant = 'fir', seed = 0) {
    const random = stream(seed), twist = random() * tau, y = ground(x, z) - .15;
    const ancient = variant === 'ancient' || variant === 1;
    const birch = variant === 'birch' || variant === 2;
    const r = height * (ancient ? .053 : birch ? .033 : .041);
    const dx = height * (random() - .5) * .044, dz = height * (random() - .5) * .044;
    const trunkColor = ancient ? 0x75543e : birch ? 0xd1c7a9 : 0x765744;
    solid(x, y, z, height * .72, r, r * .35, ancient ? 8 : 5, trunkColor, .95, twist, dx, dz);
    if (ancient) {
      // Root fins make the trunk read as monumental when walked past.
      for (let i = 0; i < 6; i++) {
        const a = twist + i * tau / 6;
        const tipX = x + Math.cos(a) * r * 2.9, tipZ = z + Math.sin(a) * r * 2.9;
        const tip = [tipX, ground(tipX, tipZ) - .06, tipZ];
        const root = [x + Math.cos(a) * r * .84, y + r * 3.3, z + Math.sin(a) * r * .84];
        const left = [x + Math.cos(a - .38) * r, y, z + Math.sin(a - .38) * r];
        const right = [x + Math.cos(a + .38) * r, y, z + Math.sin(a + .38) * r];
        tri(left, root, tip, trunkColor); tri(tip, root, right, 0x89664a);
      }
      for (let i = 0; i < 4; i++) {
        const a = twist + i * 2.4, spread = (.17 - .018 * i) * height;
        const bx = Math.cos(a) * spread, bz = Math.sin(a) * spread;
        const sy = y + height * (.31 + i * .093);
        solid(x + dx * .7, sy, z + dz * .7, height * .12, r * .44, r * .13, 4, trunkColor, 1, a, bx, bz);
        foliage(x + dx * .7 + bx, sy + height * .1, z + dz * .7 + bz, height * .145,
          height * .17, 6, a, i < 2 ? 0x335e52 : 0x487354, random, 1);
      }
      foliage(x + dx, y + height * .69, z + dz, height * .155, height * .31, 8, twist, 0x537e60, random, 1);
    } else if (birch) {
      for (let i = 0; i < 3; i++) {
        const a = twist + i * 2.2, spread = i === 2 ? 0 : height * .105;
        const bx = Math.cos(a) * spread, bz = Math.sin(a) * spread;
        const sy = y + height * (.45 + .09 * i);
        if (i < 2) solid(x, sy, z, height * .18, r * .53, r * .15, 4, trunkColor, 1, a, bx, bz);
        foliage(x + bx, sy + height * .10, z + bz, height * .152, height * .25, 5, a,
          [0x83994f, 0x96ad5c, 0xa4ba66][i], random, .4);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        // Tapered branches form three offset eight-point silhouettes with
        // irregular tips. No interior faces are generated between tiers.
        const sy = y + height * (.22 + i * .185);
        const radius = height * (.225 - i * .043), ring = [];
        const tip = [x + dx, sy + height * (.43 - .012 * i), z + dz];
        for (let j = 0; j < 8; j++) {
          const a = twist + i * .38 + j * tau / 8;
          const reach = radius * (.84 + random() * .25);
          ring.push([x + Math.cos(a) * reach, sy + height * (j % 2 ? .02 : -.026), z + Math.sin(a) * reach]);
        }
        for (let j = 0; j < 8; j++) {
          const next = ring[(j + 1) % 8], color = [0x315b50, 0x426d58, 0x568164][i];
          tri(ring[j], tip, next, color);
          tri(ring[j], next, [x, sy + height * .04, z], color, .82);
        }
      }
    }
    return r;
  }

  function drawRidge(x, z, width, height, angle, seed = 0) {
    const random = stream(seed), ca = Math.cos(angle), sa = Math.sin(angle);
    const stations = 24, phase = random() * tau;
    const point = (along, across, elevation) =>
      [x + along * ca - across * sa, elevation, z + along * sa + across * ca];
    let prev;
    for (let i = 0; i <= stations; i++) {
      const t = i / stations, along = width * (t - .5);
      const envelope = Math.pow(Math.sin(t * Math.PI), .55);
      const crown = height * envelope * (.62 + .18 * Math.sin(t * 19 + phase) + .2 * random());
      const base = -7, depth = height * (.4 + .25 * random());
      const row = [point(along,-depth,base), point(along,-depth*.48,base+crown*.45),
        point(along,-depth*.15,base+crown*.81), point(along,0,base+crown),
        point(along,depth*.63,base+crown*.35), point(along,depth,base)];
      if (prev) {
        for (let j = 0; j < row.length - 1; j++) {
          const snow = j >= 2 && j <= 3 && Math.min(row[3][1], prev[3][1]) > height * .57;
          const color = snow ? 0xd6dbd1 : [0x718582,0x768589,0x919ba2,0x788897,0x657780][j];
          tri(prev[j],row[j+1],row[j],color);
          tri(prev[j],prev[j+1],row[j+1],color,.96);
        }
      }
      prev = row;
    }
  }

  function drawMeadow(x, z, seed = 0) {
    const random = stream(seed), phase = random() * tau;
    const bloom = random() < .62 ? 0xffdc84 : 0xe4d4f4;
    for (let i = 0; i < 12; i++) {
      const a = phase + i * 2.4, r = Math.sqrt(random()) * 4.4;
      const xx = x + Math.cos(a) * r, zz = z + Math.sin(a) * r;
      const y = ground(xx, zz) - .04, h = .32 + random() * .55;
      tri([xx-.15,y,zz],[xx+.14,y,zz],[xx+.13,y+h,zz+.07],0x869849);
      tri([xx,y,zz-.17],[xx,y,zz+.16],[xx-.13,y+h*.84,zz+.1],0xa3af56);
      if (i % 3 === 0) {
        const top = [xx+.13,y+h,zz+.07];
        tri([xx,y+h+.05,zz+.05],top,[xx+.23,y+h+.09,zz+.04],bloom,1.1);
        tri([xx+.14,y+h+.09,zz-.05],top,[xx+.1,y+h+.08,zz+.2],bloom,1.1);
      }
    }
  }

  function drawLandmark(x, z, kind, seed = 0) {
    const random = stream(seed), rotation = random() * tau;
    const ruin = kind === 'ruin';
    for (let i = 0; i < (ruin ? 6 : 5); i++) {
      const a = rotation + i * tau / (ruin ? 8 : 5), radius = ruin ? 5.5 : 3.8;
      const xx = x + Math.cos(a) * radius, zz = z + Math.sin(a) * radius, y = ground(xx,zz);
      const h = (ruin ? 3.4 : 1.5) + random() * 2.1;
      const stone = i % 2 ? 0x8b8b7b : 0x999482;
      solid(xx,y-.25,zz,h,ruin ? 1 : .79,ruin ? .85 : .48,ruin ? 6 : 5,stone,.84,a,.15,.08);
      if (ruin) solid(xx+.15,y+h-.25,zz+.08,.31,1.12,1.08,6,0x85896e,.84,a);
    }
  }

  return Object.freeze({drawTree, drawRidge, drawMeadow, drawLandmark});
})();
