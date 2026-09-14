import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface HeroSceneProps {
  currentStage?: number; // 1: Transaction, 2: SMS, 3: Voice/Email, 4: Policy Gate
  onCardHover?: (cardName: string | null) => void;
}

// Helper to create high-resolution crisp canvas textures for 3D cards
function createCardTexture(
  _type: 'transaction' | 'sms' | 'voice' | 'email' | 'policy',
  data: {
    title: string;
    badge?: string;
    badgeColor?: string;
    amount?: string;
    subtitle?: string;
    meta?: string;
    quote?: string;
    risk?: string;
    status?: string;
    statusColor?: string;
  }
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background with subtle rounded border
  const r = 24;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
  ctx.lineTo(r, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Header icon bar
  ctx.fillStyle = '#0F1B33';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(data.title.toUpperCase(), 32, 46);

  if (data.badge) {
    ctx.fillStyle = data.badgeColor || '#EFF6FF';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 150, 24, 118, 30, 8);
    ctx.fill();
    ctx.fillStyle = data.badgeColor === '#EFF6FF' ? '#1769FF' : '#DC2626';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.badge, canvas.width - 91, 44);
    ctx.textAlign = 'left';
  }

  // Divider
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 68);
  ctx.lineTo(canvas.width - 32, 68);
  ctx.stroke();

  // Content
  if (data.amount) {
    ctx.fillStyle = '#0F1B33';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(data.amount, 32, 118);
  }

  if (data.subtitle) {
    ctx.fillStyle = '#475569';
    ctx.font = '17px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(data.subtitle, 32, 154);
  }

  if (data.meta) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(data.meta, 32, 184);
  }

  if (data.quote) {
    ctx.fillStyle = '#1E293B';
    ctx.font = 'italic 20px -apple-system, BlinkMacSystemFont, Georgia, serif';
    ctx.fillText(`"${data.quote}"`, 32, 126);
  }

  // Footer status bar
  if (data.status) {
    ctx.fillStyle = data.statusColor || '#059669';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`●  ${data.status}`, 32, 238);
  }

  if (data.risk) {
    ctx.fillStyle = '#64748B';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.risk, canvas.width - 32, 238);
    ctx.textAlign = 'left';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ currentStage: _currentStage = 4, onCardHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 580;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xF7F9FC, 0.045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 8.8);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Calm, bright fintech lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x1769FF, 2.5, 12);
    blueLight.position.set(0, 1.2, 2);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(0x18C8D8, 1.8, 10);
    cyanLight.position.set(-3, -1, 3);
    scene.add(cyanLight);

    // 4. Central Intelligence Core (Translucent Polyhedral Crystal Shield)
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.8, 0);

    // Outer Glass Icosahedron
    const outerGeo = new THREE.IcosahedronGeometry(1.05, 1);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.12,
      transmission: 0.88,
      ior: 1.45,
      transparent: true,
      opacity: 0.85,
      wireframe: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, glassMat);
    coreGroup.add(outerMesh);

    // Outer geometric wireframe cage
    const wireGeo = new THREE.IcosahedronGeometry(1.06, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1769FF,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wireMesh);

    // Inner Glowing Core (Octahedron emblem)
    const innerGeo = new THREE.OctahedronGeometry(0.55, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x18C8D8,
      emissive: 0x1769FF,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.7,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // Orbiting subtle rings
    const ringGeo = new THREE.TorusGeometry(1.4, 0.012, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x1769FF, transparent: true, opacity: 0.4 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.y = Math.PI / 2.8;
    ring2.rotation.x = -Math.PI / 4;
    coreGroup.add(ring2);

    scene.add(coreGroup);

    // 5. Floating Glass Cards
    const cardsGroup = new THREE.Group();
    scene.add(cardsGroup);

    const cardPlaneGeo = new THREE.PlaneGeometry(2.1, 1.15);

    // Card 1: Bank Transaction (Upper Left)
    const txnTex = createCardTexture('transaction', {
      title: 'Bank Transaction',
      badge: 'MONITORED',
      amount: '₹8,00,000',
      subtitle: 'To: New Account ••••4821',
      meta: '26 Aug 2026 · 10:18 AM',
      status: 'Status: Looks normal',
      statusColor: '#059669',
      risk: 'Baseline: Low'
    });
    const txnMat = new THREE.MeshBasicMaterial({ map: txnTex, transparent: true, opacity: 0.95 });
    const txnCard = new THREE.Mesh(cardPlaneGeo, txnMat);
    txnCard.position.set(-2.8, 1.8, 0.4);
    txnCard.rotation.y = 0.22;
    txnCard.name = 'Transaction';
    cardsGroup.add(txnCard);

    // Card 2: SMS Signal (Upper Right)
    const smsTex = createCardTexture('sms', {
      title: 'SMS Intercept',
      badge: 'URGENCY (91%)',
      badgeColor: '#FEF2F2',
      quote: 'Please approve payment. Urgent.',
      meta: 'Sender: Unknown (+91 98•••)',
      status: 'Signal: Social Pressure',
      statusColor: '#E11D48',
      risk: 'Urgency Detected'
    });
    const smsMat = new THREE.MeshBasicMaterial({ map: smsTex, transparent: true, opacity: 0.95 });
    const smsCard = new THREE.Mesh(cardPlaneGeo, smsMat);
    smsCard.position.set(2.8, 1.8, 0.4);
    smsCard.rotation.y = -0.22;
    smsCard.name = 'SMS';
    cardsGroup.add(smsCard);

    // Card 3: Voice Call Signal (Middle Left)
    const voiceTex = createCardTexture('voice', {
      title: 'Voice Call',
      badge: 'IMPERSONATION (94%)',
      badgeColor: '#FEF2F2',
      quote: 'Your account will be restricted...',
      meta: 'Acoustic Stress: High (0.88)',
      status: 'Signal: Threat / Authority',
      statusColor: '#DC2626',
      risk: 'Caller: False CBI Official'
    });
    const voiceMat = new THREE.MeshBasicMaterial({ map: voiceTex, transparent: true, opacity: 0.95 });
    const voiceCard = new THREE.Mesh(cardPlaneGeo, voiceMat);
    voiceCard.position.set(-3.1, -0.2, 0.8);
    voiceCard.rotation.y = 0.28;
    voiceCard.name = 'Voice';
    cardsGroup.add(voiceCard);

    // Card 4: Email / Redirect Signal (Middle Right)
    const emailTex = createCardTexture('email', {
      title: 'Secure Notification',
      badge: 'REDIRECT (86%)',
      badgeColor: '#FEF2F2',
      quote: 'Use new beneficiary account details.',
      meta: 'Domain: Spoofed RTGS gateway',
      status: 'Signal: Payment Redirect',
      statusColor: '#EA580C',
      risk: 'High Secrecy Condition'
    });
    const emailMat = new THREE.MeshBasicMaterial({ map: emailTex, transparent: true, opacity: 0.95 });
    const emailCard = new THREE.Mesh(cardPlaneGeo, emailMat);
    emailCard.position.set(3.1, -0.2, 0.8);
    emailCard.rotation.y = -0.28;
    emailCard.name = 'Email';
    cardsGroup.add(emailCard);

    // 6. Data Stream Lines (Curves from each card into Central Core)
    const streamGroup = new THREE.Group();
    scene.add(streamGroup);

    interface StreamLine {
      curve: THREE.QuadraticBezierCurve3;
      mesh: THREE.Line;
      particles: THREE.Points;
    }

    const streamLines: StreamLine[] = [];
    const cardPositions = [
      txnCard.position,
      smsCard.position,
      voiceCard.position,
      emailCard.position,
    ];

    cardPositions.forEach((startPos, i) => {
      const midPoint = new THREE.Vector3(
        startPos.x * 0.45,
        startPos.y * 0.45 + 0.3,
        (startPos.z + coreGroup.position.z) / 2 + 0.3
      );
      const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, coreGroup.position);
      const points = curve.getPoints(50);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      const color = i === 0 ? 0x10B981 : 0xEF4444; // Green for normal txn, Red for comms threats
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      streamGroup.add(lineMesh);

      // Particle dots moving along stream
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(3 * 6); // 6 moving particles per stream
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        color: i === 0 ? 0x10B981 : 0x18C8D8,
        size: 0.08,
        transparent: true,
        opacity: 0.85,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      streamGroup.add(particles);

      streamLines.push({ curve, mesh: lineMesh, particles });
    });

    // 7. 3D Policy Gate Slabs (Layered below the core)
    const policyGroup = new THREE.Group();
    policyGroup.position.set(0, -1.8, 0.4);
    scene.add(policyGroup);

    const slabGeo = new THREE.BoxGeometry(3.6, 0.16, 1.2);

    // Layer 1: AI Signal Extraction
    const slab1Mat = new THREE.MeshStandardMaterial({
      color: 0xEFF6FF,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const slab1 = new THREE.Mesh(slabGeo, slab1Mat);
    slab1.position.y = 0.6;
    policyGroup.add(slab1);

    // Layer 2: Evidence Fusion
    const slab2Mat = new THREE.MeshStandardMaterial({
      color: 0xDBEAFE,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
    });
    const slab2 = new THREE.Mesh(slabGeo, slab2Mat);
    slab2.position.y = 0.25;
    policyGroup.add(slab2);

    // Layer 3: Deterministic Policy Gate (Key Layer)
    const slab3Mat = new THREE.MeshStandardMaterial({
      color: 0x0F1B33,
      roughness: 0.1,
      metalness: 0.5,
    });
    const slab3 = new THREE.Mesh(slabGeo, slab3Mat);
    slab3.position.y = -0.1;
    policyGroup.add(slab3);

    // Policy Decision Output Card (Prominently HOLD)
    const holdCanvas = document.createElement('canvas');
    holdCanvas.width = 440;
    holdCanvas.height = 140;
    const hctx = holdCanvas.getContext('2d');
    if (hctx) {
      hctx.fillStyle = '#FFFFFF';
      hctx.strokeStyle = '#F97316';
      hctx.lineWidth = 4;
      hctx.beginPath();
      hctx.roundRect(0, 0, 440, 140, 16);
      hctx.fill();
      hctx.stroke();

      hctx.fillStyle = '#F97316';
      hctx.font = 'bold 22px -apple-system, sans-serif';
      hctx.fillText('POLICY DECISION: HOLD', 24, 42);

      hctx.fillStyle = '#0F1B33';
      hctx.font = 'bold 16px -apple-system, sans-serif';
      hctx.fillText('Human Review Required · SLA 15 min', 24, 76);

      hctx.fillStyle = '#64748B';
      hctx.font = '13px -apple-system, sans-serif';
      hctx.fillText('Composite Risk: 82/100 · Confidence: 87%', 24, 108);
    }
    const holdTex = new THREE.CanvasTexture(holdCanvas);
    const holdGeo = new THREE.PlaneGeometry(2.4, 0.75);
    const holdMesh = new THREE.Mesh(holdGeo, new THREE.MeshBasicMaterial({ map: holdTex, transparent: true }));
    holdMesh.position.set(0, -0.85, 0.3);
    policyGroup.add(holdMesh);

    // 8. Mouse Parallax & Raycasting
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = x * 0.35;
      mouse.targetY = y * 0.35;
      pointer.x = x;
      pointer.y = y;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 9. Visibility Observer (Pause RAF when not visible)
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(container);

    // 10. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 1.5;
      camera.position.y = 0.8 + mouse.y * 1.2;
      camera.lookAt(0, 0.2, 0);

      // Rotate core slowly
      coreGroup.rotation.y = elapsed * 0.35;
      innerMesh.rotation.x = -elapsed * 0.5;
      innerMesh.rotation.z = elapsed * 0.4;
      ring1.rotation.z = elapsed * 0.25;
      ring2.rotation.z = -elapsed * 0.2;

      // Gentle card levitation
      txnCard.position.y = 1.8 + Math.sin(elapsed * 1.2) * 0.06;
      smsCard.position.y = 1.8 + Math.sin(elapsed * 1.4 + 1) * 0.06;
      voiceCard.position.y = -0.2 + Math.sin(elapsed * 1.1 + 2) * 0.06;
      emailCard.position.y = -0.2 + Math.sin(elapsed * 1.3 + 3) * 0.06;

      // Pulse stream particles
      streamLines.forEach((stream) => {
        const positions = stream.particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 6; i++) {
          const t = ((elapsed * 0.5 + i / 6) % 1);
          const p = stream.curve.getPoint(t);
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
        }
        stream.particles.geometry.attributes.position.needsUpdate = true;
      });

      // Raycasting for interactive hover
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(cardsGroup.children);
      if (intersects.length > 0) {
        const hitName = intersects[0].object.name;
        setHoveredCard(hitName);
        if (onCardHover) onCardHover(hitName);
      } else {
        setHoveredCard(null);
        if (onCardHover) onCardHover(null);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 12. Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onCardHover]);

  return (
    <div className="relative w-full h-[540px] lg:h-[620px] select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* Interactive Tooltip HUD */}
      {hoveredCard && (
        <div className="absolute top-4 right-4 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-700 shadow-xl text-xs font-mono transition-opacity">
          Active Node: <span className="text-blue-400 font-semibold">{hoveredCard}</span> · Signal Fused
        </div>
      )}

      {/* Legend Badge Bottom */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <span>Live 3D Neural Evidence Fusion · Interactive Parallax</span>
      </div>
    </div>
  );
};
