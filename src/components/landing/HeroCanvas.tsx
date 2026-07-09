import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* Interactive scroll-driven 3D backdrop for the landing hero.
   - Distorted violet sphere reacting to mouse + scroll
   - Floating particles field
   Kept intentionally lightweight (single canvas, low-poly). */

function DistortedOrb({ scrollY }: { scrollY: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uColorA: { value: new THREE.Color('#8B5CF6') },
    uColorB: { value: new THREE.Color('#050505') },
    uColorC: { value: new THREE.Color('#C4B5FD') },
  }), []);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const t = state.clock.getElapsedTime();
    materialRef.current.uniforms.uTime.value = t;
    materialRef.current.uniforms.uScroll.value = scrollY.current;
    materialRef.current.uniforms.uMouse.value.lerp(
      new THREE.Vector2(state.pointer.x, state.pointer.y),
      0.05
    );
    meshRef.current.rotation.y = t * 0.08 + scrollY.current * 0.5;
    meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.2 + scrollY.current * 0.3;
    const s = 1 + scrollY.current * 0.4;
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef} position={[1.2, 0, 0]}>
      <icosahedronGeometry args={[1.6, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uScroll;
          uniform vec2 uMouse;
          varying vec3 vNormal;
          varying vec3 vPos;

          // Simplex-ish noise
          vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
          vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
          vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
          float snoise(vec3 v){
            const vec2 C=vec2(1.0/6.0,1.0/3.0);
            const vec4 D=vec4(0.0,0.5,1.0,2.0);
            vec3 i=floor(v+dot(v,C.yyy));
            vec3 x0=v-i+dot(i,C.xxx);
            vec3 g=step(x0.yzx,x0.xyz);
            vec3 l=1.0-g;
            vec3 i1=min(g.xyz,l.zxy);
            vec3 i2=max(g.xyz,l.zxy);
            vec3 x1=x0-i1+C.xxx;
            vec3 x2=x0-i2+C.yyy;
            vec3 x3=x0-D.yyy;
            i=mod289(i);
            vec4 p=permute(permute(permute(
              i.z+vec4(0.0,i1.z,i2.z,1.0))
              +i.y+vec4(0.0,i1.y,i2.y,1.0))
              +i.x+vec4(0.0,i1.x,i2.x,1.0));
            float n_=0.142857142857;
            vec3 ns=n_*D.wyz-D.xzx;
            vec4 j=p-49.0*floor(p*ns.z*ns.z);
            vec4 x_=floor(j*ns.z);
            vec4 y_=floor(j-7.0*x_);
            vec4 x=x_*ns.x+ns.yyyy;
            vec4 y=y_*ns.x+ns.yyyy;
            vec4 h=1.0-abs(x)-abs(y);
            vec4 b0=vec4(x.xy,y.xy);
            vec4 b1=vec4(x.zw,y.zw);
            vec4 s0=floor(b0)*2.0+1.0;
            vec4 s1=floor(b1)*2.0+1.0;
            vec4 sh=-step(h,vec4(0.0));
            vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
            vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
            vec3 p0=vec3(a0.xy,h.x);
            vec3 p1=vec3(a0.zw,h.y);
            vec3 p2=vec3(a1.xy,h.z);
            vec3 p3=vec3(a1.zw,h.w);
            vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
            vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
            m=m*m;
            return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
          }

          void main() {
            vNormal = normal;
            float n = snoise(position * 1.3 + uTime * 0.25);
            float mouseInf = length(uMouse) * 0.4;
            float amp = 0.35 + uScroll * 0.6 + mouseInf;
            vec3 displaced = position + normal * n * amp;
            vPos = displaced;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uScroll;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            float fres = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
            float band = sin(vPos.y * 3.0 + uTime * 0.5) * 0.5 + 0.5;
            vec3 col = mix(uColorB, uColorA, band);
            col = mix(col, uColorC, fres);
            col += fres * 0.3 * (1.0 + uScroll);
            gl_FragColor = vec4(col, 0.85);
          }
        `}
        transparent
      />
    </mesh>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 800;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = state.clock.getElapsedTime() * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#C4B5FD" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

const HeroCanvas: React.FC<{ scrollY: React.MutableRefObject<number> }> = ({ scrollY }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#8B5CF6" />
      <pointLight position={[-5, -3, 2]} intensity={0.5} color="#C4B5FD" />
      <DistortedOrb scrollY={scrollY} />
      <Particles />
    </Canvas>
  );
};

export default HeroCanvas;
