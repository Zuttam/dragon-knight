import * as THREE from 'three';
import { PowerUpType } from '../state/EntityState';

export class ModelFactory {
  // ── Knight ──────────────────────────────────────────────
  static createKnight(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 0.3, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    body.scale.set(1.33, 1, 1);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffcc88 })
    );
    head.position.y = 0.9;
    head.castShadow = true;
    group.add(head);

    // Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x6699cc })
    );
    helmet.scale.set(1.17, 0.5, 1);
    helmet.position.y = 0.98;
    helmet.castShadow = true;
    group.add(helmet);

    // Shield (left side)
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x888899 })
    );
    shield.scale.set(0.286, 1, 0.714);
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
    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.13, 6, 12), legMat);
    leftLeg.position.set(-0.1, 0.12, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.13, 6, 12), legMat);
    rightLeg.position.set(0.1, 0.12, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    group.scale.setScalar(1.8);
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

    group.scale.setScalar(1.8);
    return group;
  }

  // ── Dragon ──────────────────────────────────────────────
  static createDragon(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );
    body.scale.set(1, 0.667, 0.833);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff6644 })
    );
    head.scale.set(1, 0.857, 0.857);
    head.position.set(0.35, 0.45, 0);
    head.castShadow = true;
    group.add(head);

    // Horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xdd8800 });
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 12), hornMat);
    leftHorn.position.set(0.3, 0.7, -0.1);
    group.add(leftHorn);
    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 12), hornMat);
    rightHorn.position.set(0.3, 0.7, 0.1);
    group.add(rightHorn);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), eyeMat);
    leftEye.position.set(0.5, 0.52, -0.1);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), eyeMat);
    rightEye.position.set(0.5, 0.52, 0.1);
    group.add(rightEye);

    // Wings (bat-wing silhouette)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-0.25, 0.15);
    wingShape.lineTo(-0.15, 0.05);
    wingShape.lineTo(0, 0.15);
    wingShape.lineTo(0.1, 0.05);
    wingShape.lineTo(0.25, 0.12);
    wingShape.lineTo(0.25, -0.1);
    wingShape.lineTo(0, -0.15);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape, 8);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, side: THREE.DoubleSide });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.name = 'wing_left';
    leftWing.position.set(-0.05, 0.6, -0.35);
    leftWing.rotation.x = -0.3;
    leftWing.rotation.z = 0.5;
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.name = 'wing_right';
    rightWing.position.set(-0.05, 0.6, 0.35);
    rightWing.rotation.x = 0.3;
    rightWing.rotation.z = 0.5;
    group.add(rightWing);

    // Tail (chain of spheres)
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * 0.01, 12, 12), tailMat);
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
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12), legMat);
      leg.position.set(pos.x, 0.1, pos.z);
      group.add(leg);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), clawMat);
      claw.position.set(pos.x, 0.0, pos.z);
      claw.rotation.x = Math.PI;
      group.add(claw);
    }

    group.scale.setScalar(1.8);
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

    group.scale.setScalar(1.8);
    return group;
  }

  // ── Wizard ────────────────────────────────────────────
  static createWizard(): THREE.Group {
    const group = new THREE.Group();

    // Robe (cone)
    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x6622aa })
    );
    robe.position.y = 0.35;
    robe.castShadow = true;
    group.add(robe);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xeeccaa })
    );
    head.position.y = 0.8;
    head.castShadow = true;
    group.add(head);

    // Hat (tall cone)
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x4411aa })
    );
    hat.position.y = 1.1;
    hat.castShadow = true;
    group.add(hat);

    // Hat brim
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.03, 8),
      new THREE.MeshStandardMaterial({ color: 0x4411aa })
    );
    brim.position.y = 0.88;
    group.add(brim);

    // Staff
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.9, 6),
      new THREE.MeshStandardMaterial({ color: 0x664422 })
    );
    staff.position.set(0.2, 0.5, 0);
    staff.rotation.z = -0.15;
    group.add(staff);

    // Orb at staff top
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xaa66ff,
        emissive: 0x8844cc,
        emissiveIntensity: 0.8,
      })
    );
    orb.position.set(0.26, 0.98, 0);
    orb.name = 'wizard_orb';
    group.add(orb);

    // Beard
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xdddddd })
    );
    beard.position.set(0.05, 0.65, 0);
    beard.rotation.z = Math.PI;
    group.add(beard);

    group.scale.setScalar(1.8);
    return group;
  }

  // ── Torch ─────────────────────────────────────────────
  static createTorch(): THREE.Group {
    const group = new THREE.Group();

    // Wall bracket
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
    );
    bracket.position.set(0, 0.35, 0);
    group.add(bracket);

    // Wooden handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x664422 })
    );
    handle.position.set(0.1, 0.4, 0);
    handle.rotation.z = -Math.PI / 4;
    group.add(handle);

    // Flame (cone) - named so it can be toggled
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0.19, 0.53, 0);
    flameGroup.name = 'torch_flame';

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.22, 6),
      new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff6600,
        emissiveIntensity: 2.5,
      })
    );
    flameGroup.add(flame);

    // Outer glow halo
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff8833,
        transparent: true,
        opacity: 0.25,
      })
    );
    flameGroup.add(glow);

    group.add(flameGroup);

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
