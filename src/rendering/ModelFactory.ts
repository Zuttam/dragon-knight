import * as THREE from 'three';
import { PowerUpType } from '../state/EntityState';

export class ModelFactory {
  // ── Knight ──────────────────────────────────────────────
  static createKnight(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.6, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffcc88 })
    );
    head.position.y = 0.9;
    head.castShadow = true;
    group.add(head);

    // Helmet
    const helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.15, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x6699cc })
    );
    helmet.position.y = 0.98;
    helmet.castShadow = true;
    group.add(helmet);

    // Shield (left side)
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.35, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x888899 })
    );
    shield.position.set(-0.28, 0.5, 0);
    shield.castShadow = true;
    group.add(shield);

    // Shield cross (red)
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.08, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xcc2222 })
    );
    crossH.position.set(-0.34, 0.5, 0);
    group.add(crossH);

    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xcc2222 })
    );
    crossV.position.set(-0.34, 0.5, 0);
    group.add(crossV);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x335599 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.12), legMat);
    leftLeg.position.set(-0.1, 0.12, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.12), legMat);
    rightLeg.position.set(0.1, 0.12, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    return group;
  }

  // ── Sword (separate group for swing animation) ──────────
  static createSword(): THREE.Group {
    const group = new THREE.Group();

    // Blade
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.5, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.8, roughness: 0.3 })
    );
    blade.position.y = 0.25;
    blade.castShadow = true;
    group.add(blade);

    // Cross-guard
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x886633 })
    );
    guard.position.y = 0.0;
    group.add(guard);

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x553311 })
    );
    grip.position.y = -0.08;
    group.add(grip);

    return group;
  }

  // ── Dragon ──────────────────────────────────────────────
  static createDragon(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xff6644 })
    );
    head.position.set(0.35, 0.45, 0);
    head.castShadow = true;
    group.add(head);

    // Horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xdd8800 });
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), hornMat);
    leftHorn.position.set(0.3, 0.7, -0.1);
    group.add(leftHorn);
    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), hornMat);
    rightHorn.position.set(0.3, 0.7, 0.1);
    group.add(rightHorn);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    leftEye.position.set(0.5, 0.52, -0.1);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    rightEye.position.set(0.5, 0.52, 0.1);
    group.add(rightEye);

    // Wings
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, side: THREE.DoubleSide });
    const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), wingMat);
    leftWing.position.set(-0.05, 0.6, -0.35);
    leftWing.rotation.x = -0.3;
    leftWing.rotation.z = 0.5;
    group.add(leftWing);
    const rightWing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), wingMat);
    rightWing.position.set(-0.05, 0.6, 0.35);
    rightWing.rotation.x = 0.3;
    rightWing.rotation.z = 0.5;
    group.add(rightWing);

    // Tail (chain of spheres)
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * 0.01, 6, 6), tailMat);
      seg.position.set(-0.35 - i * 0.15, 0.3, 0);
      seg.name = `tail_${i}`;
      group.add(seg);
    }

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0xdd8800 });
    const legPositions = [
      { x: 0.15, z: -0.2 }, { x: 0.15, z: 0.2 },
      { x: -0.15, z: -0.2 }, { x: -0.15, z: 0.2 },
    ];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), legMat);
      leg.position.set(pos.x, 0.1, pos.z);
      group.add(leg);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), clawMat);
      claw.position.set(pos.x, 0.0, pos.z);
      claw.rotation.x = Math.PI;
      group.add(claw);
    }

    return group;
  }

  // ── Treasure Chest ──────────────────────────────────────
  static createTreasureChest(): THREE.Group {
    const group = new THREE.Group();

    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x886633 })
    );
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    // Lid
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x997744 })
    );
    lid.position.y = 0.45;
    lid.castShadow = true;
    group.add(lid);

    // Lock
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xffdd44, metalness: 0.7, roughness: 0.3 })
    );
    lock.position.set(0, 0.35, 0.18);
    group.add(lock);

    return group;
  }

  // ── Power-up models ─────────────────────────────────────
  static createPowerUp(type: PowerUpType): THREE.Group {
    const group = new THREE.Group();

    switch (type) {
      case PowerUpType.HEAL: {
        // Blue cross
        const mat = new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x2266aa, emissiveIntensity: 0.3 });
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), mat);
        h.position.y = 0.4;
        group.add(h);
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), mat);
        v.position.y = 0.4;
        group.add(v);
        break;
      }
      case PowerUpType.ATTACK_BOOST: {
        // Mini red sword
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.3, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xaa2222, emissiveIntensity: 0.3 })
        );
        blade.position.y = 0.5;
        group.add(blade);
        const guard = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.03, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x886633 })
        );
        guard.position.y = 0.35;
        group.add(guard);
        break;
      }
      case PowerUpType.SPEED_BOOST: {
        // Green lightning bolt (angled segments)
        const mat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.3 });
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.04), mat);
        s1.position.set(-0.04, 0.5, 0);
        s1.rotation.z = 0.3;
        group.add(s1);
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.04), mat);
        s2.position.set(0.04, 0.35, 0);
        s2.rotation.z = -0.3;
        group.add(s2);
        break;
      }
      case PowerUpType.SHADOW_CLOAK: {
        // Purple semi-transparent sphere
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x8844cc, transparent: true, opacity: 0.6, emissive: 0x4422aa, emissiveIntensity: 0.3 })
        );
        sphere.position.y = 0.4;
        group.add(sphere);
        break;
      }
      case PowerUpType.FIRE_RESIST: {
        // Orange shield shape
        const shield = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.25, 0.04),
          new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xaa4422, emissiveIntensity: 0.3 })
        );
        shield.position.y = 0.4;
        group.add(shield);
        break;
      }
      case PowerUpType.HP_BOOST: {
        // Gold heart (two spheres + cone)
        const mat = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xaa8822, emissiveIntensity: 0.3 });
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
        l.position.set(-0.06, 0.48, 0);
        group.add(l);
        const r = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
        r.position.set(0.06, 0.48, 0);
        group.add(r);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.15, 4), mat);
        cone.position.set(0, 0.35, 0);
        cone.rotation.z = Math.PI;
        group.add(cone);
        break;
      }
    }

    return group;
  }

  // ── Wall tile mesh (not instanced — used for instancing templates) ──
  static createWallGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(1, 0.8, 1);
  }

  static createWoodWallGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(1, 0.6, 1);
  }
}
