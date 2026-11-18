import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { ArticulatedLimbs, createCreatureModel } from '../entities/CharacterModels';
import { AIState, CreatureId, Difficulty } from '../types';
import { ColliderBox, groundHeightAt } from '../world/WorldBuilder';

export interface EnemyAgent {
  id: string;
  creatureId: CreatureId;
  group: THREE.Group;
  limbs: ArticulatedLimbs;
  state: AIState;
  health: number;
  maxHealth: number;
  speedPatrol: number;
  speedChase: number;
  visionRange: number;
  hearingRange: number;
  attackRange: number;
  damage: number;
  lastKnownPlayerPos: THREE.Vector3 | null;
  patrolTarget: THREE.Vector3;
  stateTimer: number;
  attackCooldown: number;
  soundCooldown: number;
  stunTimer: number;
  respawnTimer: number;
  homePos: THREE.Vector3;
  animPhase: number;
}

const _toPlayer = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

export class CreatureAIManager {
  public agents: EnemyAgent[] = [];
  private scene: THREE.Scene;
  private adaptiveAggression = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clear(): void {
    for (const a of this.agents) {
      this.scene.remove(a.group);
    }
    this.agents = [];
  }

  public spawnCreatures(activeIds: CreatureId[], difficulty: Difficulty): void {
    this.clear();
    const diffMult =
      difficulty === 'historia' ? 0.72 : difficulty === 'pesadilla' ? 1.32 : 1.0;

    const spawnPoints: Record<CreatureId, THREE.Vector3> = {
      lobizon: new THREE.Vector3(38, 0, -40),
      ocumar: new THREE.Vector3(18, 0, -56),
      mulanima: new THREE.Vector3(0, 0, 56),
      duende: new THREE.Vector3(-28, 0, -14),
      familiar: new THREE.Vector3(-56, 0, 38),
      alma_mula: new THREE.Vector3(-48, 0, 54),
    };

    activeIds.forEach((cid, idx) => {
      const { group, limbs } = createCreatureModel(cid);
      const sp = spawnPoints[cid] || new THREE.Vector3(30, 0, -30);
      sp.y = groundHeightAt(sp.x, sp.z);
      group.position.copy(sp);
      this.scene.add(group);

      const baseHp =
        cid === 'lobizon'
          ? 160
          : cid === 'familiar'
          ? 200
          : cid === 'mulanima'
          ? 999
          : cid === 'ocumar'
          ? 110
          : 80;

      const agent: EnemyAgent = {
        id: `${cid}_${idx}`,
        creatureId: cid,
        group,
        limbs,
        state: 'patrol',
        health: baseHp,
        maxHealth: baseHp,
        speedPatrol: (cid === 'mulanima' ? 4.8 : cid === 'duende' ? 3.4 : 2.5) * diffMult,
        speedChase:
          (cid === 'mulanima'
            ? 9.6
            : cid === 'lobizon'
            ? 6.6
            : cid === 'ocumar'
            ? 6.0
            : cid === 'familiar'
            ? 6.2
            : 4.5) * diffMult,
        visionRange: cid === 'ocumar' ? 28 : cid === 'lobizon' ? 26 : 22,
        hearingRange: cid === 'lobizon' ? 30 : 22,
        attackRange: cid === 'ocumar' ? 2.4 : 2.1,
        damage:
          (cid === 'lobizon' ? 26 : cid === 'mulanima' ? 30 : cid === 'duende' ? 10 : 22) *
          diffMult,
        lastKnownPlayerPos: null,
        patrolTarget: sp.clone().add(new THREE.Vector3(10, 0, 10)),
        stateTimer: 4,
        attackCooldown: 0,
        soundCooldown: 2 + Math.random() * 4,
        stunTimer: 0,
        respawnTimer: 0,
        homePos: sp.clone(),
        animPhase: Math.random() * 10,
      };
      this.agents.push(agent);
    });
  }

  public adjustAdaptiveDifficulty(playerHealthRatio: number): void {
    // Gently eases pressure when player is critically injured without breaking tension
    this.adaptiveAggression = THREE.MathUtils.clamp(
      0.78 + playerHealthRatio * 0.35,
      0.75,
      1.15
    );
  }

  public damageAgent(
    agent: EnemyAgent,
    amount: number,
    isHolyOrSalt = false
  ): { killed: boolean; repelled: boolean } {
    if (agent.state === 'respawn') return { killed: false, repelled: false };
    if (
      (agent.creatureId === 'mulanima' || agent.creatureId === 'alma_mula') &&
      !isHolyOrSalt
    ) {
      // Bullets only briefly stagger spectral mules
      agent.stunTimer = 0.8;
      return { killed: false, repelled: false };
    }

    agent.health -= amount;
    agent.stunTimer = 0.55;
    if (agent.health <= 0) {
      agent.state = 'retreat';
      agent.stateTimer = 4.0;
      agent.respawnTimer = 26;
      return { killed: true, repelled: true };
    }
    if (agent.creatureId === 'duende' || (isHolyOrSalt && agent.health < agent.maxHealth * 0.6)) {
      agent.state = 'retreat';
      agent.stateTimer = 5.0;
      return { killed: false, repelled: true };
    }
    return { killed: false, repelled: false };
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    playerNoise: number, // 0..1
    flashlightOn: boolean,
    isFullMoon: boolean,
    rainIntensity: number,
    playerInsideSafeHouse: boolean,
    colliders: ColliderBox[],
    audio: AudioManager,
    onPlayerHit: (damage: number, creatureId: CreatureId) => void,
    onDuendeEvent: (msg: string) => void,
    onCreatureSpotted: (creatureId: CreatureId) => void
  ): { maxThreat: number; nearestCreature: CreatureId | null } {
    let maxThreat = 0;
    let nearestCreature: CreatureId | null = null;

    const rainMask = 1 - rainIntensity * 0.42;

    for (const a of this.agents) {
      if (a.attackCooldown > 0) a.attackCooldown -= dt;
      if (a.soundCooldown > 0) a.soundCooldown -= dt;

      if (a.state === 'respawn') {
        a.respawnTimer -= dt;
        a.group.visible = false;
        if (a.respawnTimer <= 0) {
          a.group.visible = true;
          a.health = a.maxHealth;
          a.group.position.copy(a.homePos);
          a.state = 'patrol';
        }
        continue;
      }

      if (a.stunTimer > 0) {
        a.stunTimer -= dt;
        continue;
      }

      _toPlayer.subVectors(playerPos, a.group.position);
      const dist = _toPlayer.length();
      const moonBoost = a.creatureId === 'lobizon' && isFullMoon ? 1.28 : 1.0;

      // Threat proximity meter
      const threat = THREE.MathUtils.clamp(1 - dist / 34, 0, 1);
      if (threat > maxThreat) {
        maxThreat = threat;
        nearestCreature = a.creatureId;
      }
      if (dist < 24) {
        onCreatureSpotted(a.creatureId);
      }

      // Sensory perception
      const effectiveVision =
        a.visionRange *
        (flashlightOn ? 1.25 : 0.72) *
        (1 - rainIntensity * 0.25) *
        moonBoost;
      const effectiveHearing =
        a.hearingRange * (0.35 + playerNoise * 0.95) * rainMask * moonBoost;

      const canSee =
        !playerInsideSafeHouse &&
        dist < effectiveVision &&
        (dist < 10 || flashlightOn || isFullMoon);
      const canHear = !playerInsideSafeHouse && dist < effectiveHearing && playerNoise > 0.22;

      // State transitions
      if (playerInsideSafeHouse && a.state !== 'retreat') {
        if (a.state === 'chase' || a.state === 'attack') {
          a.state = 'search';
          a.stateTimer = 4.0;
        }
      }

      if (a.state === 'retreat') {
        a.stateTimer -= dt;
        _moveDir.subVectors(a.group.position, playerPos).setY(0).normalize();
        this.moveAgent(a, _moveDir, a.speedChase * 1.1, dt, colliders);
        if (a.stateTimer <= 0) {
          if (a.health <= 0) {
            a.state = 'respawn';
          } else {
            a.state = 'patrol';
          }
        }
        this.animateAgent(a, dt, true);
        continue;
      }

      if (canSee) {
        a.lastKnownPlayerPos = playerPos.clone();
        if (a.state === 'patrol' || a.state === 'explore') {
          a.state = 'observe';
          a.stateTimer = 0.75;
        } else if (a.state === 'observe' || a.state === 'suspect' || a.state === 'listen') {
          a.stateTimer -= dt;
          if (a.stateTimer <= 0 || dist < 12) {
            a.state = 'detect';
            a.stateTimer = 0.45;
            audio.playCreatureSound(
              a.creatureId,
              'alert',
              playerPos,
              playerYaw,
              a.group.position
            );
          }
        } else if (a.state === 'detect') {
          a.stateTimer -= dt;
          if (a.stateTimer <= 0) a.state = 'chase';
        } else if (dist <= a.attackRange) {
          a.state = 'attack';
        } else {
          a.state = 'chase';
        }
      } else if (canHear && (a.state === 'patrol' || a.state === 'explore')) {
        a.lastKnownPlayerPos = playerPos.clone();
        a.state = 'listen';
        a.stateTimer = 1.6;
      }

      // Execute behavior by state
      switch (a.state) {
        case 'patrol':
        case 'explore': {
          const toTarget = _moveDir.subVectors(a.patrolTarget, a.group.position).setY(0);
          if (toTarget.length() < 2.2) {
            a.state = a.state === 'patrol' ? 'explore' : 'patrol';
            a.patrolTarget.set(
              a.homePos.x + (Math.random() - 0.5) * 42,
              0,
              a.homePos.z + (Math.random() - 0.5) * 42
            );
            a.patrolTarget.x = THREE.MathUtils.clamp(a.patrolTarget.x, -95, 95);
            a.patrolTarget.z = THREE.MathUtils.clamp(a.patrolTarget.z, -95, 95);
          } else {
            toTarget.normalize();
            this.moveAgent(a, toTarget, a.speedPatrol, dt, colliders);
          }
          break;
        }
        case 'listen':
        case 'observe':
        case 'suspect': {
          // Face player suspiciously
          const angle = Math.atan2(_toPlayer.x, _toPlayer.z);
          a.group.rotation.y = angle;
          a.stateTimer -= dt;
          if (a.stateTimer <= 0 && !canSee) {
            a.state = a.lastKnownPlayerPos ? 'search' : 'patrol';
            a.stateTimer = 5;
          }
          break;
        }
        case 'detect': {
          const angle = Math.atan2(_toPlayer.x, _toPlayer.z);
          a.group.rotation.y = angle;
          break;
        }
        case 'chase': {
          // Duende prefers mischief & luring over brute melee
          if (a.creatureId === 'duende' && dist < 5.5) {
            if (a.soundCooldown <= 0) {
              a.soundCooldown = 9;
              audio.playCreatureSound('duende', 'chase', playerPos, playerYaw, a.group.position);
              onDuendeEvent('El Duende se ríe entre las chapas y altera tu pulso.');
            }
            a.state = 'retreat';
            a.stateTimer = 3.5;
            break;
          }
          const target = a.lastKnownPlayerPos ?? playerPos;
          _moveDir.subVectors(target, a.group.position).setY(0);
          if (_moveDir.length() < 1.2 && !canSee) {
            a.state = 'search';
            a.stateTimer = 5.0;
          } else {
            _moveDir.normalize();
            this.moveAgent(
              a,
              _moveDir,
              a.speedChase * moonBoost * this.adaptiveAggression,
              dt,
              colliders
            );
          }
          if (dist <= a.attackRange && !playerInsideSafeHouse) {
            a.state = 'attack';
          }
          break;
        }
        case 'attack': {
          const angle = Math.atan2(_toPlayer.x, _toPlayer.z);
          a.group.rotation.y = angle;
          if (a.attackCooldown <= 0 && dist <= a.attackRange + 0.5 && !playerInsideSafeHouse) {
            a.attackCooldown = a.creatureId === 'lobizon' ? 1.35 : 1.6;
            audio.playCreatureSound(
              a.creatureId,
              'attack',
              playerPos,
              playerYaw,
              a.group.position
            );
            onPlayerHit(Math.round(a.damage * moonBoost), a.creatureId);
            if (a.creatureId === 'mulanima') {
              // Mulánima charges past and vanishes briefly into mist
              a.state = 'retreat';
              a.stateTimer = 3.2;
            }
          } else if (dist > a.attackRange + 0.8) {
            a.state = 'chase';
          }
          break;
        }
        case 'search': {
          a.stateTimer -= dt;
          if (a.lastKnownPlayerPos) {
            _moveDir.subVectors(a.lastKnownPlayerPos, a.group.position).setY(0);
            if (_moveDir.length() > 1.5) {
              _moveDir.normalize();
              this.moveAgent(a, _moveDir, a.speedPatrol * 1.15, dt, colliders);
            }
          }
          if (a.stateTimer <= 0) {
            a.lastKnownPlayerPos = null;
            a.state = 'patrol';
          }
          break;
        }
      }

      // Ambient spatial creature vocalizations
      if (a.soundCooldown <= 0 && dist < 52) {
        a.soundCooldown = a.state === 'chase' ? 3.5 : 8 + Math.random() * 8;
        audio.playCreatureSound(
          a.creatureId,
          a.state === 'chase' ? 'chase' : 'alert',
          playerPos,
          playerYaw,
          a.group.position
        );
      }

      this.animateAgent(a, dt, a.state === 'chase' || a.state === 'retreat');
    }

    return { maxThreat, nearestCreature };
  }

  private moveAgent(
    a: EnemyAgent,
    dir: THREE.Vector3,
    speed: number,
    dt: number,
    colliders: ColliderBox[]
  ): void {
    const stepX = dir.x * speed * dt;
    const stepZ = dir.z * speed * dt;
    const nx = a.group.position.x + stepX;
    const nz = a.group.position.z + stepZ;

    let blockedX = false;
    let blockedZ = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (nx > c.minX && nx < c.maxX && a.group.position.z > c.minZ && a.group.position.z < c.maxZ) {
        blockedX = true;
      }
      if (a.group.position.x > c.minX && a.group.position.x < c.maxX && nz > c.minZ && nz < c.maxZ) {
        blockedZ = true;
      }
    }

    if (!blockedX) a.group.position.x = THREE.MathUtils.clamp(nx, -110, 110);
    if (!blockedZ) a.group.position.z = THREE.MathUtils.clamp(nz, -110, 110);
    if (blockedX && blockedZ) {
      // Sidestep obstacle
      a.group.position.x += -dir.z * speed * 0.5 * dt;
      a.group.position.z += dir.x * speed * 0.5 * dt;
    }

    a.group.position.y = groundHeightAt(a.group.position.x, a.group.position.z);
    if (dir.lengthSq() > 0.001) {
      const targetYaw = Math.atan2(dir.x, dir.z);
      a.group.rotation.y = targetYaw;
    }
  }

  private animateAgent(a: EnemyAgent, dt: number, fast: boolean): void {
    const rate = fast ? 11 : 4.5;
    a.animPhase += dt * rate;
    const swing = Math.sin(a.animPhase) * (fast ? 0.65 : 0.35);

    if (a.limbs.leftLeg) a.limbs.leftLeg.rotation.x = swing;
    if (a.limbs.rightLeg) a.limbs.rightLeg.rotation.x = -swing;
    if (a.limbs.leftArm) a.limbs.leftArm.rotation.x = -swing * 0.85;
    if (a.limbs.rightArm) a.limbs.rightArm.rotation.x = swing * 0.85;

    // Lobizón drops into quadruped-like crouch when chasing fast!
    if (a.creatureId === 'lobizon' && a.limbs.torso) {
      const targetLean = fast ? 0.65 : 0.15;
      a.limbs.torso.rotation.x = THREE.MathUtils.damp(
        a.limbs.torso.rotation.x,
        targetLean,
        8,
        dt
      );
    }

    // Mulánima dragging chains rattle
    if (a.limbs.chains) {
      a.limbs.chains.forEach((c, idx) => {
        c.rotation.z = Math.sin(a.animPhase * 1.4 + idx) * 0.28;
      });
    }
  }
}
