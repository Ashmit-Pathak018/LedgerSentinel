import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ShieldCtaScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x1769FF, 2.0, 10);
    blueLight.position.set(-2, 3, 3);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(0x18C8D8, 1.5, 10);
    cyanLight.position.set(2, -2, 2);
    scene.add(cyanLight);

    // Shield Geometry shape
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.8);
    shieldShape.lineTo(1.4, 1.2);
    shieldShape.quadraticCurveTo(1.5, -0.4, 0, -1.8);
    shieldShape.quadraticCurveTo(-1.5, -0.4, -1.4, 1.2);
    shieldShape.lineTo(0, 1.8);

    const extrudeSettings = {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeo.center();

    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.08,
      roughness: 0.15,
      transmission: 0.9,
      ior: 1.48,
      transparent: true,
      opacity: 0.75,
      reflectivity: 0.6,
    });

    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    scene.add(shieldMesh);

    // Wireframe edge accent
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1769FF,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireMesh = new THREE.Mesh(shieldGeo, wireMat);
    scene.add(wireMesh);

    // Subtle orbiting halo
    const haloGeo = new THREE.TorusGeometry(2.4, 0.015, 16, 100);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x18C8D8, transparent: true, opacity: 0.35 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2.5;
    scene.add(halo);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      shieldMesh.rotation.y = Math.sin(t * 0.4) * 0.22;
      shieldMesh.rotation.x = Math.cos(t * 0.3) * 0.1;
      wireMesh.rotation.copy(shieldMesh.rotation);

      halo.rotation.z = t * 0.2;
      halo.rotation.y = Math.sin(t * 0.25) * 0.15;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-85">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
