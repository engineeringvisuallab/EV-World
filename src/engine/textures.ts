import * as THREE from 'three';

// Cache generated textures so materials share them
const textureCache: { [key: string]: THREE.CanvasTexture } = {};

export function getAsphaltTexture(type: 'road' | 'highway' | 'bridge' = 'road'): THREE.CanvasTexture {
  const cacheKey = `asphalt_${type}`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt with subtle grain
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Fine aggregate texture noise
  for (let i = 0; i < 45000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const size = Math.random() * 2 + 1;
    const shade = Math.floor(Math.random() * 40 + 20);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    ctx.fillRect(x, y, size, size);
  }

  // Tar seam & tire wear paths
  ctx.fillStyle = 'rgba(15, 17, 20, 0.4)';
  ctx.fillRect(160, 0, 200, 1024);
  ctx.fillRect(664, 0, 200, 1024);

  if (type === 'highway') {
    // Solid white edge lines
    ctx.fillStyle = '#f0f3f6';
    ctx.fillRect(40, 0, 20, 1024);
    ctx.fillRect(964, 0, 20, 1024);

    // Dashed center lane lines (yellow & white)
    ctx.fillStyle = '#ffd100';
    for (let y = 0; y < 1024; y += 128) {
      ctx.fillRect(504, y + 20, 16, 75);
    }

    ctx.fillStyle = '#f0f3f6';
    for (let y = 0; y < 1024; y += 128) {
      ctx.fillRect(260, y + 20, 12, 75);
      ctx.fillRect(752, y + 20, 12, 75);
    }
  } else if (type === 'bridge') {
    // Expansion joints / drainage grills
    ctx.fillStyle = '#3a3f47';
    for (let y = 0; y < 1024; y += 256) {
      ctx.fillRect(0, y, 1024, 14);
    }
    // Solid lane dividers
    ctx.fillStyle = '#f0f3f6';
    ctx.fillRect(60, 0, 16, 1024);
    ctx.fillRect(948, 0, 16, 1024);
    for (let y = 0; y < 1024; y += 128) {
      ctx.fillRect(504, y + 20, 16, 80);
    }
  } else {
    // Standard city road
    ctx.fillStyle = '#f0f3f6';
    ctx.fillRect(50, 0, 14, 1024);
    ctx.fillRect(960, 0, 14, 1024);
    ctx.fillStyle = '#ffd100';
    for (let y = 0; y < 1024; y += 110) {
      ctx.fillRect(504, y + 15, 16, 65);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache[cacheKey] = texture;
  return texture;
}

export function getConcreteTexture(type: 'pylon' | 'foundation' | 'panel' = 'pylon'): THREE.CanvasTexture {
  const cacheKey = `concrete_${type}`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base raw industrial concrete tone
  ctx.fillStyle = '#9e9f9c';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro surface variation
  for (let i = 0; i < 30000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 3 + 1;
    const v = Math.floor(Math.random() * 35 - 18);
    const base = 158 + v;
    ctx.fillStyle = `rgb(${base},${base - 2},${base - 5})`;
    ctx.fillRect(x, y, s, s);
  }

  // Formwork panels and tie-rod holes
  const gridSize = 256;
  ctx.strokeStyle = 'rgba(70, 70, 70, 0.4)';
  ctx.lineWidth = 3;

  for (let x = 0; x <= 1024; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Tie-rod circular recesses (form tie indentations)
  ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
  for (let x = 40; x < 1024; x += gridSize) {
    for (let y = 40; y < 1024; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + gridSize - 80, y + gridSize - 80, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache[cacheKey] = texture;
  return texture;
}

export function getExcavationSoilTexture(): THREE.CanvasTexture {
  if (textureCache['soil_strata']) return textureCache['soil_strata'];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Layered strata (Brown loam, silt, dense clay, grey bedrock)
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#5a4632'); // Top soil
  grad.addColorStop(0.3, '#73573c'); // Clay layer
  grad.addColorStop(0.6, '#4d3d2e'); // Sandy gravel
  grad.addColorStop(1.0, '#383b38'); // Bedrock
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Gravel & rock chunks
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 4 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(30, 25, 20, 0.6)' : 'rgba(140, 120, 95, 0.4)';
    ctx.fillRect(x, y, s, s);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache['soil_strata'] = texture;
  return texture;
}

export function getSolarPanelTexture(): THREE.CanvasTexture {
  if (textureCache['solar_pv']) return textureCache['solar_pv'];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep anti-reflective marine blue PV silicon
  ctx.fillStyle = '#0b1d3a';
  ctx.fillRect(0, 0, 512, 512);

  // Cell grid lines (Silver busbars)
  ctx.strokeStyle = '#2b5282';
  ctx.lineWidth = 2;
  const cellSize = 64;

  for (let x = 0; x <= 512; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Fine silver conductor fingers
  ctx.strokeStyle = '#6390c4';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Aluminum frame border
  ctx.strokeStyle = '#c5ccd6';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache['solar_pv'] = texture;
  return texture;
}

export function getSteelTrussTexture(): THREE.CanvasTexture {
  if (textureCache['steel_truss']) return textureCache['steel_truss'];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#545963';
  ctx.fillRect(0, 0, 512, 512);

  // Rivet patterns
  ctx.fillStyle = '#26292e';
  for (let x = 20; x < 512; x += 60) {
    for (let y = 20; y < 512; y += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache['steel_truss'] = texture;
  return texture;
}

export function getTerrainTexture(): THREE.CanvasTexture {
  if (textureCache['terrain_composite']) return textureCache['terrain_composite'];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base earth & grass blend
  ctx.fillStyle = '#3f5236'; // Rich satellite green
  ctx.fillRect(0, 0, 1024, 1024);

  // Cultivated field patches & soil blends
  for (let i = 0; i < 35; i++) {
    const rx = Math.random() * 900;
    const ry = Math.random() * 900;
    const rw = Math.random() * 140 + 60;
    const rh = Math.random() * 140 + 60;
    const greenShade = Math.random() > 0.5 ? '#4b613e' : '#574836';
    ctx.fillStyle = greenShade;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(30, 40, 25, 0.4)';
    ctx.strokeRect(rx, ry, rw, rh);
  }

  // Noise for grass texture
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 2 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? '#36462e' : '#4d6342';
    ctx.fillRect(x, y, s, s);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache['terrain_composite'] = texture;
  return texture;
}

export function getBuildingFacadeTexture(style: 'modern' | 'commercial' | 'industrial'): THREE.CanvasTexture {
  const cacheKey = `facade_${style}`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (style === 'modern') {
    // Glass curtain wall with sleek mullions
    ctx.fillStyle = '#1e2c3b';
    ctx.fillRect(0, 0, 512, 512);

    const winW = 32;
    const winH = 48;
    for (let x = 6; x < 512; x += 40) {
      for (let y = 6; y < 512; y += 60) {
        ctx.fillStyle = Math.random() > 0.2 ? '#6488a8' : '#88aed4';
        ctx.fillRect(x, y, winW, winH);
        ctx.strokeStyle = '#111a24';
        ctx.strokeRect(x, y, winW, winH);
      }
    }
  } else if (style === 'commercial') {
    // Architectural concrete columns & ribbon windows
    ctx.fillStyle = '#a6aba8';
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 20; y < 512; y += 80) {
      ctx.fillStyle = '#2f4154';
      ctx.fillRect(10, y, 492, 40);
      ctx.strokeStyle = '#1b2633';
      ctx.strokeRect(10, y, 492, 40);
    }
  } else {
    // Corrugated metal industrial cladding
    ctx.fillStyle = '#68727d';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? '#545c66' : '#7a8591';
      ctx.fillRect(x, 0, 16, 512);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache[cacheKey] = texture;
  return texture;
}
