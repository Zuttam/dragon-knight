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
    ModelFactory.buildSwordParts(group, 8);
    group.scale.setScalar(1.8);
    return group;
  }

  // ── FPS Sword (camera-local, higher detail) ──────────
  static createFPSSword(): THREE.Group {
    const group = new THREE.Group();
    ModelFactory.buildSwordParts(group, 16);
    return group;
  }

  private static buildSwordParts(group: THREE.Group, segments: number): void {
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xdddde8, metalness: 0.9, roughness: 0.2,
    });

    // Tapered blade via ExtrudeGeometry
    const bladeShape = new THREE.Shape();
    const bw = 0.035; // half-width at base
    const bh = 0.7;   // blade height
    bladeShape.moveTo(-bw, 0);
    bladeShape.lineTo(-bw, bh * 0.85);
    bladeShape.lineTo(0, bh); // taper to point
    bladeShape.lineTo(bw, bh * 0.85);
    bladeShape.lineTo(bw, 0);
    bladeShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.025, bevelEnabled: true, bevelThickness: 0.004,
      bevelSize: 0.004, bevelSegments: segments > 8 ? 3 : 1,
    });
    bladeGeo.center();
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.35;
    blade.rotation.x = 0; // flat face forward
    blade.castShadow = true;
    group.add(blade);

    // Fuller (blood groove) — dark strip along center
    const fullerGeo = new THREE.BoxGeometry(0.015, 0.45, 0.028);
    const fullerMat = new THREE.MeshStandardMaterial({
      color: 0x8888aa, metalness: 0.95, roughness: 0.15,
    });
    const fuller = new THREE.Mesh(fullerGeo, fullerMat);
    fuller.position.y = 0.30;
    fuller.position.z = 0.001;
    group.add(fuller);

    // Edge glow — thin emissive planes along blade edges
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x88bbff, emissive: 0x88bbff, emissiveIntensity: 0.15,
      transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    });
    const edgeGeo = new THREE.PlaneGeometry(0.006, 0.6);
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.set(side * 0.038, 0.32, 0.013);
      group.add(edge);
    }

    // Cross-guard — wider bar with sphere caps
    const guardMat = new THREE.MeshStandardMaterial({
      color: 0x886633, metalness: 0.6, roughness: 0.4,
    });
    const guardBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.035, 0.05),
      guardMat
    );
    guardBar.position.y = 0.0;
    group.add(guardBar);

    // Guard sphere caps
    const capGeo = new THREE.SphereGeometry(0.022, segments, segments);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, guardMat);
      cap.position.set(side * 0.11, 0, 0);
      group.add(cap);
    }

    // Grip — cylinder
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x553311, roughness: 0.8, metalness: 0.1,
    });
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.022, 0.13, segments),
      gripMat
    );
    grip.position.y = -0.085;
    group.add(grip);

    // Pommel — brass sphere at bottom
    const pommelMat = new THREE.MeshStandardMaterial({
      color: 0xccaa44, metalness: 0.7, roughness: 0.3,
    });
    const pommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, segments, segments),
      pommelMat
    );
    pommel.position.y = -0.17;
    group.add(pommel);
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
    bracket.position.set(0, 1.0, 0);
    group.add(bracket);

    // Wooden handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x664422 })
    );
    handle.position.set(0.1, 1.1, 0);
    handle.rotation.z = -Math.PI / 4;
    group.add(handle);

    // Flame (cone) - named so it can be toggled
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0.19, 1.4, 0);
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

  // ── Furniture ──────────────────────────────────────────

  static createTable(): THREE.Group {
    const group = new THREE.Group();
    const topMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x7A5C10 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.4), topMat);
    top.position.y = 0.34;
    top.castShadow = true;
    group.add(top);

    for (const [lx, lz] of [[0.25, 0.15], [0.25, -0.15], [-0.25, 0.15], [-0.25, -0.15]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.30), legMat);
      leg.position.set(lx, 0.15, lz);
      leg.castShadow = true;
      group.add(leg);
    }
    return group;
  }

  static createChair(): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.28), woodMat);
    seat.position.y = 0.26;
    seat.castShadow = true;
    group.add(seat);

    for (const [lx, lz] of [[0.10, 0.10], [0.10, -0.10], [-0.10, 0.10], [-0.10, -0.10]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), woodMat);
      leg.position.set(lx, 0.125, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.25, 0.03), woodMat);
    back.position.set(0, 0.40, -0.125);
    back.castShadow = true;
    group.add(back);
    return group;
  }

  static createWardrobe(): THREE.Group {
    const group = new THREE.Group();

    const darkWood = new THREE.MeshStandardMaterial({ color: 0x3D2208, roughness: 0.9 });
    const midWood  = new THREE.MeshStandardMaterial({ color: 0x6B4512, roughness: 0.85 });
    const lightWood = new THREE.MeshStandardMaterial({ color: 0x8B6420, roughness: 0.8 });
    const interior = new THREE.MeshStandardMaterial({ color: 0x120A02 });
    const brass    = new THREE.MeshStandardMaterial({ color: 0xCCAA44, metalness: 0.7, roughness: 0.3 });
    const iron     = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, metalness: 0.6, roughness: 0.5 });

    // ── Feet ─────────────────────────────────────────────
    const footGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    for (const [fx, fz] of [[-0.24, 0.13], [0.24, 0.13], [-0.24, -0.13], [0.24, -0.13]]) {
      const foot = new THREE.Mesh(footGeo, darkWood);
      foot.position.set(fx, 0.035, fz);
      group.add(foot);
    }

    // ── Baseboard molding ─────────────────────────────────
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.07, 0.34), lightWood);
    base.position.set(0, 0.105, 0);
    group.add(base);

    // ── Back panel ───────────────────────────────────────
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.94, 0.025), darkWood);
    back.position.set(0, 0.61, -0.155);
    back.castShadow = true;
    group.add(back);

    // ── Side panels ──────────────────────────────────────
    for (const sx of [-0.265, 0.265]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.94, 0.31), darkWood);
      side.position.set(sx, 0.61, 0);
      side.castShadow = true;
      group.add(side);
    }

    // ── Top panel (inside) ───────────────────────────────
    const topInner = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.025, 0.31), darkWood);
    topInner.position.set(0, 1.055, 0);
    group.add(topInner);

    // ── Bottom shelf (inside) ─────────────────────────────
    const botShelf = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.025, 0.31), midWood);
    botShelf.position.set(0, 0.145, 0);
    group.add(botShelf);

    // ── Dark interior (visible through door gap) ──────────
    const interiorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.90, 0.26), interior);
    interiorMesh.position.set(0, 0.61, -0.02);
    group.add(interiorMesh);

    // ── Hanging rod inside ────────────────────────────────
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.48, 6), iron);
    rod.position.set(0, 0.88, -0.04);
    group.add(rod);

    // ── Center divider strip ─────────────────────────────
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.90, 0.025), midWood);
    divider.position.set(0, 0.61, 0.155);
    group.add(divider);

    // ── Crown molding ─────────────────────────────────────
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.36), lightWood);
    crown.position.set(0, 1.11, 0);
    crown.castShadow = true;
    group.add(crown);
    const crownTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.035, 0.32), midWood);
    crownTop.position.set(0, 1.165, 0);
    group.add(crownTop);

    // ── Left door pivot (hinge at x = -0.265) ────────────
    const doorPivotLeft = new THREE.Group();
    doorPivotLeft.name = 'wardrobe_door_left';
    doorPivotLeft.position.set(-0.265, 0.61, 0.155);

    const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.90, 0.028), midWood);
    doorLMesh.position.set(0.128, 0, 0);
    doorLMesh.castShadow = true;
    doorPivotLeft.add(doorLMesh);

    // Panel insets on left door
    for (const py of [0.20, -0.22]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.30, 0.01), lightWood);
      panel.position.set(0.128, py, 0.014);
      doorPivotLeft.add(panel);
      // Inner shadow frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.31, 0.005), darkWood);
      frame.position.set(0.128, py, 0.011);
      doorPivotLeft.add(frame);
    }

    // Hinges on left door (at hinge edge)
    const hingeGeo = new THREE.BoxGeometry(0.022, 0.045, 0.022);
    for (const hy of [0.34, -0.30]) {
      const hinge = new THREE.Mesh(hingeGeo, iron);
      hinge.position.set(0.008, hy, 0.012);
      doorPivotLeft.add(hinge);
    }

    // Knob on left door (right side = toward center)
    const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), brass);
    knobL.position.set(0.24, 0, 0.028);
    doorPivotLeft.add(knobL);
    // Knob plate
    const plateLGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.008, 8);
    const plateL = new THREE.Mesh(plateLGeo, brass);
    plateL.rotation.x = Math.PI / 2;
    plateL.position.set(0.24, 0, 0.018);
    doorPivotLeft.add(plateL);

    group.add(doorPivotLeft);

    // ── Right door pivot (hinge at x = +0.265) ───────────
    const doorPivotRight = new THREE.Group();
    doorPivotRight.name = 'wardrobe_door_right';
    doorPivotRight.position.set(0.265, 0.61, 0.155);

    const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.90, 0.028), midWood);
    doorRMesh.position.set(-0.128, 0, 0);
    doorRMesh.castShadow = true;
    doorPivotRight.add(doorRMesh);

    // Panel insets on right door
    for (const py of [0.20, -0.22]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.30, 0.01), lightWood);
      panel.position.set(-0.128, py, 0.014);
      doorPivotRight.add(panel);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.31, 0.005), darkWood);
      frame.position.set(-0.128, py, 0.011);
      doorPivotRight.add(frame);
    }

    // Hinges on right door
    for (const hy of [0.34, -0.30]) {
      const hinge = new THREE.Mesh(hingeGeo, iron);
      hinge.position.set(-0.008, hy, 0.012);
      doorPivotRight.add(hinge);
    }

    // Knob on right door (left side = toward center)
    const knobR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), brass);
    knobR.position.set(-0.24, 0, 0.028);
    doorPivotRight.add(knobR);
    const plateRGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.008, 8);
    const plateR = new THREE.Mesh(plateRGeo, brass);
    plateR.rotation.x = Math.PI / 2;
    plateR.position.set(-0.24, 0, 0.018);
    doorPivotRight.add(plateR);

    group.add(doorPivotRight);

    return group;
  }

  static createBookshelf(variant: number = 0): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7A5C10 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.25), woodMat);
    frame.position.y = 0.30;
    frame.castShadow = true;
    group.add(frame);

    for (const sy of [0.14, 0.30, 0.46]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.02, 0.23), woodMat);
      shelf.position.y = sy;
      group.add(shelf);
    }

    const bookColors = [0xcc2222, 0x2244aa, 0x22aa44, 0x8844aa, 0xaa8822, 0x228888, 0x884422, 0xdddddd];
    const shelfYs = [0.14, 0.30, 0.46];
    let colorIdx = variant * 3;
    for (const baseY of shelfYs) {
      const numBooks = 6 + Math.floor((colorIdx % 3));
      let bx = -0.22;
      for (let b = 0; b < numBooks && bx < 0.22; b++) {
        const bh = 0.08 + (((colorIdx + b) * 7) % 5) * 0.015;
        const color = bookColors[(colorIdx + b) % bookColors.length];
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, bh, 0.18),
          new THREE.MeshStandardMaterial({ color })
        );
        book.position.set(bx, baseY + 0.02 + bh / 2, 0);
        group.add(book);
        bx += 0.065;
      }
      colorIdx += numBooks;
    }
    return group;
  }

  static createBarrel(): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.35, 12), woodMat);
    body.position.y = 0.175;
    body.castShadow = true;
    group.add(body);

    for (const by of [0.06, 0.175, 0.29]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.01, 8, 16), metalMat);
      band.position.y = by;
      band.rotation.x = Math.PI / 2;
      group.add(band);
    }

    const lidRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 12), metalMat);
    lidRing.position.y = 0.355;
    lidRing.rotation.x = Math.PI / 2;
    group.add(lidRing);
    return group;
  }

  static createBed(variant: number = 0): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7A5C10 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.12, 0.45), woodMat);
    frame.position.y = 0.10;
    frame.castShadow = true;
    group.add(frame);

    for (const [lx, lz] of [[0.30, 0.18], [0.30, -0.18], [-0.30, 0.18], [-0.30, -0.18]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.10), woodMat);
      leg.position.set(lx, 0.05, lz);
      group.add(leg);
    }

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.08, 0.40),
      new THREE.MeshStandardMaterial({ color: 0xddccaa })
    );
    mattress.position.y = 0.20;
    mattress.castShadow = true;
    group.add(mattress);

    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.05, 0.30),
      new THREE.MeshStandardMaterial({ color: 0xeeeedd })
    );
    pillow.position.set(-0.22, 0.26, 0);
    group.add(pillow);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.45), woodMat);
    headboard.position.set(-0.34, 0.22, 0);
    headboard.castShadow = true;
    group.add(headboard);

    const blanketColors = [0xcc2222, 0x2244aa, 0x22aa44];
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, 0.40),
      new THREE.MeshStandardMaterial({ color: blanketColors[variant % blanketColors.length] })
    );
    blanket.position.set(0.10, 0.24, 0);
    blanket.castShadow = true;
    group.add(blanket);
    return group;
  }

  static createRug(variant: number = 0): THREE.Group {
    const group = new THREE.Group();
    const rugColors = [0x882222, 0x222288, 0x226622];

    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xCCAA44, side: THREE.DoubleSide })
    );
    border.position.y = 0.003;
    border.rotation.x = -Math.PI / 2;
    group.add(border);

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.5),
      new THREE.MeshStandardMaterial({ color: rugColors[variant % rugColors.length], side: THREE.DoubleSide })
    );
    base.position.y = 0.005;
    base.rotation.x = -Math.PI / 2;
    group.add(base);

    const diamond = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xCCAA44, side: THREE.DoubleSide })
    );
    diamond.position.y = 0.006;
    diamond.rotation.x = -Math.PI / 2;
    diamond.rotation.z = Math.PI / 4;
    group.add(diamond);
    return group;
  }

  static createChandelier(): THREE.Group {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.3 });

    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.20), metalMat);
    chain.position.y = 2.2;
    group.add(chain);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 16), metalMat);
    ring.position.y = 2.1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.03), metalMat);
    hub.position.y = 2.1;
    group.add(hub);

    const candleMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 2.0,
    });

    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    for (const angle of angles) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12), metalMat);
      arm.position.set(Math.cos(angle) * 0.075, 2.1, Math.sin(angle) * 0.075);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = angle;
      group.add(arm);

      const tipX = Math.cos(angle) * 0.15;
      const tipZ = Math.sin(angle) * 0.15;

      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06), candleMat);
      candle.position.set(tipX, 2.13, tipZ);
      group.add(candle);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), flameMat);
      flame.position.set(tipX, 2.18, tipZ);
      flame.name = 'chandelier_flame';
      group.add(flame);
    }
    return group;
  }

  static createArmorStand(): THREE.Group {
    const group = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.5 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.6, roughness: 0.4 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 12), darkMat);
    base.position.y = 0.02;
    base.castShadow = true;
    group.add(base);

    for (const lz of [-0.05, 0.05]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.25), silverMat);
      leg.position.set(0, 0.165, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.14), silverMat);
    torso.position.y = 0.38;
    torso.castShadow = true;
    group.add(torso);

    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 0.16), silverMat);
    shoulders.position.y = 0.48;
    shoulders.castShadow = true;
    group.add(shoulders);

    for (const [ax, az, rot] of [[0.18, 0, 0.15], [-0.18, 0, -0.15]] as [number, number, number][]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.22), silverMat);
      arm.position.set(ax, 0.38, az);
      arm.rotation.z = rot;
      arm.castShadow = true;
      group.add(arm);
    }

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), silverMat);
    helmet.scale.y = 0.85;
    helmet.position.y = 0.56;
    helmet.castShadow = true;
    group.add(helmet);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.02, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x222233 })
    );
    visor.position.set(0, 0.54, 0.04);
    group.add(visor);

    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.12, 6),
      new THREE.MeshStandardMaterial({ color: 0xcc2222 })
    );
    plume.position.y = 0.66;
    group.add(plume);
    return group;
  }

  static createBanner(variant: number = 0): THREE.Group {
    const group = new THREE.Group();
    const bannerColors = [0xcc2222, 0x2244aa, 0x22aa44];

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x664422 })
    );
    rod.position.y = 1.7;
    rod.rotation.z = Math.PI / 2;
    group.add(rod);

    const fabric = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.35),
      new THREE.MeshStandardMaterial({
        color: bannerColors[variant % bannerColors.length],
        side: THREE.DoubleSide,
      })
    );
    fabric.position.y = 1.4;
    group.add(fabric);

    const emblem = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.12, 0.005),
      new THREE.MeshStandardMaterial({ color: 0xCCAA44, metalness: 0.5, roughness: 0.4 })
    );
    emblem.position.y = 1.4;
    emblem.position.z = 0.003;
    group.add(emblem);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xCCAA44 });
    for (const tx of [-0.13, 0.13]) {
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.05), goldMat);
      tassel.position.set(tx, 1.05, 0);
      group.add(tassel);
    }
    return group;
  }

  static createFireplace(): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x666677, roughness: 0.9 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.95 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.85 });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 1.5,
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff5500,
      emissiveIntensity: 2.0,
    });

    // Back wall (thick stone slab recessed into wall)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), stoneMat);
    backWall.position.set(0, 0.4, -0.3);
    backWall.castShadow = true;
    group.add(backWall);

    // Firebox interior (dark recess)
    const firebox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.45, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 })
    );
    firebox.position.set(0, 0.25, -0.22);
    group.add(firebox);

    // Left pillar
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.2), stoneMat);
    leftPillar.position.set(-0.35, 0.4, -0.22);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.2), stoneMat);
    rightPillar.position.set(0.35, 0.4, -0.22);
    rightPillar.castShadow = true;
    group.add(rightPillar);

    // Mantel (top shelf)
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.22), darkStoneMat);
    mantel.position.set(0, 0.82, -0.22);
    mantel.castShadow = true;
    group.add(mantel);

    // Hearth (floor slab extending forward)
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.35), darkStoneMat);
    hearth.position.set(0, 0.02, -0.12);
    group.add(hearth);

    // Logs (two crossed cylinders)
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.35, 8), logMat);
    log1.position.set(0, 0.1, -0.18);
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.3;
    group.add(log1);

    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.3, 8), logMat);
    log2.position.set(0, 0.12, -0.18);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = -0.4;
    group.add(log2);

    // Glowing embers under the logs
    const embers = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), emberMat);
    embers.position.set(0, 0.05, -0.18);
    embers.rotation.x = -Math.PI / 2;
    group.add(embers);

    // Flame (cone shape rising from logs)
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), flameMat);
    flame.position.set(0, 0.28, -0.18);
    flame.name = 'fireplace_flame';
    group.add(flame);

    // Smaller side flames
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 5), flameMat);
    flameL.position.set(-0.08, 0.22, -0.18);
    flameL.rotation.z = 0.2;
    group.add(flameL);

    const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 5), flameMat);
    flameR.position.set(0.08, 0.22, -0.18);
    flameR.rotation.z = -0.2;
    group.add(flameR);

    return group;
  }

  static createCauldron(): THREE.Group {
    const group = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });
    const liquidMat = new THREE.MeshStandardMaterial({
      color: 0x334422,
      emissive: 0x223311,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 1.2,
    });

    // Tripod legs (3 angled cylinders)
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 6), ironMat);
      leg.position.set(Math.cos(angle) * 0.12, 0.15, Math.sin(angle) * 0.12);
      leg.rotation.z = Math.cos(angle) * 0.25;
      leg.rotation.x = Math.sin(angle) * 0.25;
      leg.castShadow = true;
      group.add(leg);
    }

    // Pot body (hemisphere using sphere with clipping — use half-sphere geometry)
    const pot = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      ironMat
    );
    pot.position.y = 0.22;
    pot.rotation.x = Math.PI;
    pot.castShadow = true;
    group.add(pot);

    // Inner pot wall (slightly smaller to give thickness)
    const potInner = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
    );
    potInner.position.y = 0.22;
    potInner.rotation.x = Math.PI;
    group.add(potInner);

    // Rim (torus around the top)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 8, 16), rimMat);
    rim.position.y = 0.22;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // Murky liquid surface
    const liquid = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 12),
      liquidMat
    );
    liquid.position.y = 0.20;
    liquid.rotation.x = -Math.PI / 2;
    group.add(liquid);

    // Handle (arching over the top)
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.012, 8, 12, Math.PI),
      ironMat
    );
    handle.position.y = 0.30;
    handle.rotation.y = Math.PI / 4;
    group.add(handle);

    // Embers / small fire underneath
    const embers = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), emberMat);
    embers.position.y = 0.01;
    embers.rotation.x = -Math.PI / 2;
    group.add(embers);

    // Small flame underneath
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.1, 5),
      new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff5500,
        emissiveIntensity: 1.5,
      })
    );
    flame.position.y = 0.06;
    group.add(flame);

    return group;
  }

  static createBench(): THREE.Group {
    const group = new THREE.Group();
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x7A5C10, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x6B4512, roughness: 0.85 });

    // Long plank seat (wider than a chair)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.035, 0.22), seatMat);
    seat.position.y = 0.24;
    seat.castShadow = true;
    group.add(seat);

    // 4 legs
    for (const [lx, lz] of [[0.27, 0.08], [0.27, -0.08], [-0.27, 0.08], [-0.27, -0.08]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.22), legMat);
      leg.position.set(lx, 0.11, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    // Cross-brace (long stretcher connecting the legs along the length)
    const braceL = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.025, 0.02), legMat);
    braceL.position.set(0, 0.08, 0.08);
    group.add(braceL);

    const braceR = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.025, 0.02), legMat);
    braceR.position.set(0, 0.08, -0.08);
    group.add(braceR);

    // Cross-brace connecting the two sides
    const crossBrace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.16), legMat);
    crossBrace.position.set(0, 0.08, 0);
    group.add(crossBrace);

    return group;
  }

  static createCrate(variant: number = 0): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 });
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x7A5C10, roughness: 0.9 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x6B4512, roughness: 0.9 });

    // Main crate body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.3), woodMat);
    body.position.y = 0.14;
    body.castShadow = true;
    group.add(body);

    // Lid (slightly overhanging)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.33), stripMat);
    lid.position.y = 0.295;
    lid.castShadow = true;
    group.add(lid);

    // Horizontal plank strips on front face
    for (const sy of [0.06, 0.14, 0.22]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.005), darkWood);
      strip.position.set(0, sy, 0.153);
      group.add(strip);
    }

    // Vertical reinforcement strips on front face
    for (const sx of [-0.13, 0.13]) {
      const vStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.005), darkWood);
      vStrip.position.set(sx, 0.14, 0.153);
      group.add(vStrip);
    }

    // Variant 1+: stacked smaller crate on top
    if (variant >= 1) {
      const smallBody = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.22), woodMat);
      smallBody.position.set(0.03, 0.42, -0.02);
      smallBody.rotation.y = 0.3;
      smallBody.castShadow = true;
      group.add(smallBody);

      const smallLid = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.25), stripMat);
      smallLid.position.set(0.03, 0.535, -0.02);
      smallLid.rotation.y = 0.3;
      group.add(smallLid);
    }

    return group;
  }

  static createWeaponRack(variant: number = 0): THREE.Group {
    const group = new THREE.Group();
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3D2208, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4512, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaabb, metalness: 0.7, roughness: 0.3 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });

    // Backboard (tall wooden plank mounted on wall)
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.04), darkWoodMat);
    backboard.position.set(0, 0.45, -0.28);
    backboard.castShadow = true;
    group.add(backboard);

    // Horizontal pegs / hooks (2 pairs for holding weapons)
    for (const py of [0.55, 0.35]) {
      for (const px of [-0.15, 0.15]) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), woodMat);
        peg.position.set(px, py, -0.22);
        peg.rotation.x = Math.PI / 2;
        group.add(peg);
      }
    }

    // Sword resting on upper pegs
    // Blade
    const swordBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.035, 0.015),
      metalMat
    );
    swordBlade.position.set(0.02, 0.55, -0.16);
    group.add(swordBlade);

    // Sword guard
    const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.025), handleMat);
    swordGuard.position.set(-0.16, 0.55, -0.16);
    group.add(swordGuard);

    // Sword grip
    const swordGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.10, 6), handleMat);
    swordGrip.position.set(-0.22, 0.55, -0.16);
    swordGrip.rotation.z = Math.PI / 2;
    group.add(swordGrip);

    // Axe resting on lower pegs
    // Axe handle
    const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6), handleMat);
    axeHandle.position.set(0, 0.35, -0.16);
    axeHandle.rotation.z = Math.PI / 2;
    group.add(axeHandle);

    // Axe head
    const axeHeadShape = new THREE.Shape();
    axeHeadShape.moveTo(0, -0.06);
    axeHeadShape.quadraticCurveTo(0.07, 0, 0, 0.06);
    axeHeadShape.lineTo(-0.02, 0.04);
    axeHeadShape.lineTo(-0.02, -0.04);
    axeHeadShape.closePath();
    const axeHeadGeo = new THREE.ExtrudeGeometry(axeHeadShape, { depth: 0.02, bevelEnabled: false });
    const axeHead = new THREE.Mesh(axeHeadGeo, metalMat);
    axeHead.position.set(0.16, 0.35, -0.17);
    group.add(axeHead);

    // Variant 1+: optional shield leaning against the bottom
    if (variant >= 1) {
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.7 });
      const shieldRimMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.6, roughness: 0.4 });

      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), shieldMat);
      shield.position.set(0.12, 0.14, -0.20);
      shield.rotation.x = -0.15;
      group.add(shield);

      const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 8, 8), shieldRimMat);
      shieldRim.position.set(0.12, 0.14, -0.19);
      shieldRim.rotation.x = -0.15;
      group.add(shieldRim);

      // Shield boss (center metal bump)
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), shieldRimMat);
      boss.position.set(0.12, 0.14, -0.18);
      group.add(boss);
    }

    return group;
  }

  // ── Staircase ──────────────────────────────────────────
  static createStaircase(): THREE.Group {
    const group = new THREE.Group();

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8888a0, roughness: 0.7 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6a82, roughness: 0.8 });
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.3, roughness: 0.6 });
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x4488ff,
      emissiveIntensity: 1.2,
    });

    // ── Steps ─────────────────────────────────────────────
    const numSteps = 8;
    const stepWidth = 0.9;
    const totalDepth = 0.95;
    const stepDepth = totalDepth / numSteps;
    const stepRise = 0.25;
    const startZ = totalDepth / 2;
    const topHeight = numSteps * stepRise; // 2.0

    for (let i = 0; i < numSteps; i++) {
      const h = (i + 1) * stepRise;
      const z = startZ - i * stepDepth - stepDepth / 2;

      // Stone step (full-height box → classic stair profile from side)
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth, h, stepDepth - 0.005),
        i % 2 === 0 ? stoneMat : darkStoneMat
      );
      step.position.set(0, h / 2, z);
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);

      // Red carpet runner on each tread (visible from above)
      const carpet = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth * 0.45, 0.02, stepDepth),
        carpetMat
      );
      carpet.position.set(0, h + 0.01, z);
      group.add(carpet);
    }

    // ── Side walls ────────────────────────────────────────
    const wallH = topHeight + 0.6;
    for (const sx of [-(stepWidth / 2 + 0.03), stepWidth / 2 + 0.03]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, wallH, totalDepth),
        railMat
      );
      wall.position.set(sx, wallH / 2, 0);
      wall.castShadow = true;
      group.add(wall);
    }

    // ── Portal doorframe at the top ───────────────────────
    const portalZ = -totalDepth / 2 - 0.02;
    const portalTop = 2.5; // same height as walls

    // Stone pillars
    const pillarH = portalTop - topHeight;
    for (const sx of [-(stepWidth / 2 - 0.05), stepWidth / 2 - 0.05]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, pillarH, 0.14),
        stoneMat
      );
      pillar.position.set(sx, topHeight + pillarH / 2, portalZ);
      pillar.castShadow = true;
      group.add(pillar);

      // Glowing blue inlay strip on pillar face
      const inlay = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, pillarH - 0.15, 0.15),
        portalMat
      );
      inlay.position.set(sx, topHeight + pillarH / 2, portalZ);
      group.add(inlay);
    }

    // Stone crossbar
    const crossbar = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth, 0.14, 0.14),
      stoneMat
    );
    crossbar.position.set(0, portalTop, portalZ);
    crossbar.castShadow = true;
    group.add(crossbar);

    // Glowing crossbar inlay
    const crossInlay = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth - 0.28, 0.05, 0.15),
      portalMat
    );
    crossInlay.position.set(0, portalTop, portalZ);
    group.add(crossInlay);

    // Semi-transparent portal fill (pulsing glow visible in both views)
    const portalFill = new THREE.Mesh(
      new THREE.PlaneGeometry(stepWidth - 0.28, pillarH - 0.14),
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      })
    );
    portalFill.position.set(0, topHeight + pillarH / 2, portalZ + 0.01);
    portalFill.name = 'stair_portal';
    group.add(portalFill);

    // ── Large glowing arrow above portal ──────────────────
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x4488ff,
      emissiveIntensity: 1.5,
    });
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.4, 4),
      arrowMat
    );
    arrow.position.set(0, portalTop + 0.45, portalZ);
    arrow.name = 'stair_arrow';
    group.add(arrow);

    // Glow sphere around arrow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
      })
    );
    glow.position.copy(arrow.position);
    glow.name = 'stair_glow';
    group.add(glow);

    // ── Entry carpet extending from the base of the stairs ─
    const entryCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth * 0.45, 0.02, 0.3),
      carpetMat
    );
    entryCarpet.position.set(0, 0.01, startZ + 0.15);
    group.add(entryCarpet);

    // ── Glowing ground ring at entry (top-down visibility) ─
    const entryRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.4, 16),
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    entryRing.position.set(0, 0.03, startZ + 0.15);
    entryRing.rotation.x = -Math.PI / 2;
    entryRing.name = 'stair_entry_ring';
    group.add(entryRing);

    return group;
  }

  // ── Wall tile mesh (not instanced — used for instancing templates) ──
  static createWallGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(1, 2.5, 1);
  }

  static createWoodWallGeometry(): THREE.BoxGeometry {
    return new THREE.BoxGeometry(1, 2.0, 1);
  }
}
