// Small data-driven skill tree with prerequisite and budget validation.
export const SKILL_NODES = Object.freeze({
  conduit:{name:'Arc Conduit',max:3,cost:1,requires:[],effect:{energyRegen:.08}},
  fracture:{name:'Fracture',max:3,cost:1,requires:['conduit'],effect:{structureDamage:.12}},
  echo:{name:'Echo Cast',max:2,cost:2,requires:['conduit'],effect:{projectileEcho:.12}},
  impact:{name:'Titanbreaker',max:3,cost:1,requires:['fracture'],effect:{weakPointDamage:.15}},
  momentum:{name:'Momentum',max:3,cost:1,requires:[],effect:{moveSpeed:.05}},
  phase:{name:'Phase Runner',max:2,cost:2,requires:['momentum'],effect:{dashCooldown:-.08}},
  singularity:{name:'Singularity',max:1,cost:3,requires:['echo','impact'],effect:{ultimateRadius:.35}}
});
export function createSkillTree(initialPoints = 6) {
  const ranks = Object.fromEntries(Object.keys(SKILL_NODES).map(id=>[id,0]));
  let points = initialPoints;
  function unlock(id) {
    const node = SKILL_NODES[id];
    if (!node) return {ok:false,reason:'unknown-node'};
    if (ranks[id] >= node.max) return {ok:false,reason:'max-rank'};
    if (points < node.cost) return {ok:false,reason:'points'};
    if (node.requires.some(required=>ranks[required]===0)) return {ok:false,reason:'prerequisite'};
    ranks[id]++;points-=node.cost;
    return {ok:true,rank:ranks[id],points};
  }
  function bonuses() {
    const result = {};
    for(const [id,rank] of Object.entries(ranks)) if(rank){
      for(const [stat,value] of Object.entries(SKILL_NODES[id].effect)) result[stat]=(result[stat]||0)+value*rank;
    }
    return result;
  }
  return {unlock,bonuses,ranks,get points(){return points}};
}
