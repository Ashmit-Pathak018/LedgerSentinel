import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const PrivacyPhoneScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);

    const blueRimLight = new THREE.PointLight(0x1769FF, 2.2, 8);
    blueRimLight.position.set(-3, 2, 2);
    scene.add(blueRimLight);

    const cyanRimLight = new THREE.PointLight(0x18C8D8, 1.8, 8);
    cyanRimLight.position.set(3, -2, 2);
    scene.add(cyanRimLight);

    // 4. Smartphone Model (Sleek modern unibody chassis)
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(-0.8, 0, 0);
    scene.add(phoneGroup);

    // Phone body chassis (Rounded Box)
    const phoneWidth = 2.2;
    const phoneHeight = 4.2;
    const phoneDepth = 0.18;

    const chassisGeo = new THREE.BoxGeometry(phoneWidth, phoneHeight, phoneDepth);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0F1B33,
      metalness: 0.8,
      roughness: 0.25,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    phoneGroup.add(chassis);

    // Bezel screen
    const screenGeo = new THREE.PlaneGeometry(phoneWidth - 0.16, phoneHeight - 0.22);

    // Draw dynamic phone screen texture
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 980;
    const sctx = screenCanvas.getContext('2d');
    if (sctx) {
      // Dark slate privacy background
      sctx.fillStyle = '#090E1A';
      sctx.fillRect(0, 0, 512, 980);

      // Header status
      sctx.fillStyle = '#10B981';
      sctx.beginPath();
      sctx.arc(48, 56, 10, 0, Math.PI * 2);
      sctx.fill();

      sctx.fillStyle = '#FFFFFF';
      sctx.font = 'bold 22px -apple-system, sans-serif';
      sctx.fillText('ON-DEVICE ENCLAVE', 74, 64);

      sctx.fillStyle = '#64748B';
      sctx.font = '16px -apple-system, sans-serif';
      sctx.fillText('Hardware Keystore Active', 74, 94);

      // Local Privacy Lock Banner
      sctx.fillStyle = '#0F1B33';
      sctx.strokeStyle = '#1E293B';
      sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.roundRect(32, 130, 448, 120, 16);
      sctx.fill();
      sctx.stroke();

      sctx.fillStyle = '#38BDF8';
      sctx.font = 'bold 18px -apple-system, sans-serif';
      sctx.fillText('🔒 RAW DATA NEVER LEAVES DEVICE', 52, 172);

      sctx.fillStyle = '#94A3B8';
      sctx.font = '15px -apple-system, sans-serif';
      sctx.fillText('Voice, SMS, and Email text remain in local memory.', 52, 206);
      sctx.fillText('Evaluated via edge SLM with differential privacy.', 52, 228);

      // Message 1: SMS
      sctx.fillStyle = '#111C30';
      sctx.beginPath();
      sctx.roundRect(32, 276, 448, 140, 16);
      sctx.fill();
      sctx.fillStyle = '#38BDF8';
      sctx.font = 'bold 16px -apple-system, sans-serif';
      sctx.fillText('INTERCEPTED SMS · LOCAL BUFFER', 52, 312);
      sctx.fillStyle = '#F1F5F9';
      sctx.font = 'italic 18px Georgia, serif';
      sctx.fillText('"Please approve payment immediately..."', 52, 350);
      sctx.fillStyle = '#EF4444';
      sctx.font = 'bold 14px -apple-system, sans-serif';
      sctx.fillText('Extracted: Urgency Signal (0.91) · Text Destroyed', 52, 390);

      // Message 2: Voice
      sctx.fillStyle = '#111C30';
      sctx.beginPath();
      sctx.roundRect(32, 436, 448, 140, 16);
      sctx.fill();
      sctx.fillStyle = '#38BDF8';
      sctx.font = 'bold 16px -apple-system, sans-serif';
      sctx.fillText('VOICE INFERENCE · ON-DEVICE NLP', 52, 472);
      sctx.fillStyle = '#F1F5F9';
      sctx.font = 'italic 18px Georgia, serif';
      sctx.fillText('"Your account will be restricted if..."', 52, 510);
      sctx.fillStyle = '#EF4444';
      sctx.font = 'bold 14px -apple-system, sans-serif';
      sctx.fillText('Extracted: Impersonation Signal (0.94) · Audio Dropped', 52, 550);

      // Bottom Status
      sctx.fillStyle = '#10B981';
      sctx.font = 'bold 16px -apple-system, sans-serif';
      sctx.fillText('✓ Mathematical Privacy Guarantee (Rule 6)', 52, 620);
    }

    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.z = phoneDepth / 2 + 0.005;
    phoneGroup.add(screenMesh);

    // Glowing boundary halo (Privacy Enclave shield)
    const haloGeo = new THREE.TorusGeometry(2.6, 0.02, 16, 100);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0.5 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    phoneGroup.add(halo);

    // 5. Emerging Signal Spheres & Particles (Only signals travel out!)
    const signalGroup = new THREE.Group();
    scene.add(signalGroup);

    const signals = [
      { label: 'Urgency', score: '0.91', color: 0xEF4444, y: 1.4 },
      { label: 'Impersonation', score: '0.94', color: 0xEF4444, y: 0.5 },
      { label: 'Redirect', score: '0.86', color: 0xF59E0B, y: -0.4 },
      { label: 'Secrecy', score: '0.88', color: 0x7C3AED, y: -1.3 },
    ];

    interface SignalNode {
      mesh: THREE.Mesh;
      targetX: number;
      baseY: number;
      speed: number;
    }

    const signalNodes: SignalNode[] = [];

    signals.forEach((sig, i) => {
      // Create canvas badge for each traveling signal
      const sigCanvas = document.createElement('canvas');
      sigCanvas.width = 240;
      sigCanvas.height = 70;
      const c = sigCanvas.getContext('2d');
      if (c) {
        c.fillStyle = '#FFFFFF';
        c.strokeStyle = '#CBD5E1';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(4, 4, 232, 62, 12);
        c.fill();
        c.stroke();

        c.fillStyle = sig.color === 0xEF4444 ? '#DC2626' : sig.color === 0xF59E0B ? '#D97706' : '#7C3AED';
        c.font = 'bold 16px -apple-system, sans-serif';
        c.fillText(`● ${sig.label.toUpperCase()}`, 20, 34);

        c.fillStyle = '#64748B';
        c.font = 'bold 14px -apple-system, sans-serif';
        c.fillText(`Weight: ${sig.score}`, 20, 54);
      }

      const tex = new THREE.CanvasTexture(sigCanvas);
      const geo = new THREE.PlaneGeometry(1.5, 0.45);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(1.2 + i * 0.4, sig.y, 0.2);
      signalGroup.add(mesh);

      signalNodes.push({
        mesh,
        targetX: 2.2,
        baseY: sig.y,
        speed: 0.8 + i * 0.15,
      });
    });

    // 6. Animation loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle phone float & subtle rotation
      phoneGroup.rotation.y = Math.sin(t * 0.8) * 0.12 - 0.15;
      phoneGroup.position.y = Math.sin(t * 1.1) * 0.08;
      halo.rotation.z = t * 0.3;

      // Pulse traveling signals toward policy gate
      signalNodes.forEach((node, idx) => {
        node.mesh.position.x = 1.0 + ((t * node.speed + idx * 0.5) % 2.2);
        node.mesh.position.y = node.baseY + Math.sin(t * 1.8 + idx) * 0.04;
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[460px] lg:h-[500px]">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-6 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Zero-Egress Acoustic & Text Signal Processing
      </div>
    </div>
  );
};
