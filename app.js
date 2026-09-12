const locations = {
  'dense-urban': {
    label: 'Dense urban center',
    ambientPeak: 35,
    roofMaterial: 'shingle-dark',
    roofOffset: 20,
    hint: 'High building density, low tree cover.'
  },
  'industrial': {
    label: 'Industrial zone',
    ambientPeak: 34,
    roofMaterial: 'metal',
    roofOffset: 24,
    hint: 'Extensive pavement and metal roofing, minimal greenery.'
  },
  'suburban': {
    label: 'Suburban residential',
    ambientPeak: 32,
    roofMaterial: 'shingle-light',
    roofOffset: 15,
    hint: 'Lower density, more lawns and street-side trees.'
  }
};

const timeSettings = {
  morning: { ambientShift: -7, solarMult: 0.45, label: 'morning' },
  midday: { ambientShift: -2, solarMult: 0.8, label: 'midday' },
  peak: { ambientShift: 0, solarMult: 1.0, label: 'afternoon peak' }
};

const baseOffsets = {
  parkingLot: 27,
  road: 27,
  sidewalk: 18,
  park: -1
};

const interventionEffects = {
  trees: { parkingLot: 2, sidewalk: 6, road: 0, rooftop: 0, park: 5, ambient: 1 },
  shade: { parkingLot: 11, sidewalk: 9, road: 5, rooftop: 0, park: 0, ambient: 0 },
  reflect: { parkingLot: 8, sidewalk: 3, road: 8, rooftop: 9, park: 0, ambient: 0 }
};

const zoneLabels = {
  parkingLot: 'Parking lot',
  road: 'Road',
  sidewalk: 'Sidewalk',
  rooftop: 'Rooftop',
  park: 'Park / green space'
};

const colorStops = [
  [15, [62, 124, 108]],
  [30, [166, 138, 44]],
  [42, [193, 68, 14]],
  [55, [122, 30, 30]]
];

const state = {
  location: 'dense-urban',
  time: 'midday',
  trees: false,
  shade: false,
  reflect: false
};

function activeInterventions() {
  return ['trees', 'shade', 'reflect'].filter((name) => state[name]);
}

function computeZoneTemps(locationId, timeId, interventions) {
  const loc = locations[locationId];
  const time = timeSettings[timeId];
  const ambientDrop = interventions.includes('trees') ? interventionEffects.trees.ambient : 0;
  const ambient = loc.ambientPeak + time.ambientShift - ambientDrop;

  const materialOffset = {
    parkingLot: baseOffsets.parkingLot,
    road: baseOffsets.road,
    sidewalk: baseOffsets.sidewalk,
    rooftop: loc.roofOffset,
    park: baseOffsets.park
  };

  const zones = {};
  Object.keys(materialOffset).forEach((zone) => {
    let reduction = 0;
    interventions.forEach((name) => {
      reduction += interventionEffects[name][zone] || 0;
    });
    const raw = ambient + (materialOffset[zone] - reduction) * time.solarMult;
    zones[zone] = Math.round(raw * 10) / 10;
  });

  return { ambient: Math.round(ambient * 10) / 10, zones };
}

function tempToColor(temp) {
  if (temp <= colorStops[0][0]) return colorStops[0][1];
  for (let i = 0; i < colorStops.length - 1; i++) {
    const [t0, c0] = colorStops[i];
    const [t1, c1] = colorStops[i + 1];
    if (temp >= t0 && temp <= t1) {
      const f = (temp - t0) / (t1 - t0);
      return c0.map((v, idx) => Math.round(v + (c1[idx] - v) * f));
    }
  }
  return colorStops[colorStops.length - 1][1];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function riskFromTemp(temp) {
  if (temp < 30) return { label: 'Low', color: 'var(--heat-low)' };
  if (temp < 42) return { label: 'Moderate', color: 'var(--heat-mid)' };
  if (temp < 52) return { label: 'High', color: 'var(--heat-high)' };
  return { label: 'Extreme', color: 'var(--heat-extreme)' };
}

const zoneGeometry = {
  parkingLot: { x: 20, y: 30, width: 170, height: 205 },
  road: { x: 0, y: 260, width: 400, height: 40 },
  sidewalk: { x: 0, y: 235, width: 400, height: 25 },
  rooftop: { x: 210, y: 30, width: 170, height: 100 },
  park: { x: 210, y: 135, width: 170, height: 100 }
};

const treeSpots = [
  { cx: 46, cy: 45, r: 7 },
  { cx: 96, cy: 45, r: 7 },
  { cx: 146, cy: 45, r: 7 },
  { cx: 240, cy: 160, r: 8 },
  { cx: 285, cy: 195, r: 8 },
  { cx: 335, cy: 155, r: 8 }
];

const shadeSpots = [
  { x: 35, y: 45, width: 95, height: 40 },
  { x: 35, y: 200, width: 130, height: 20 }
];

function buildMapSvg() {
  const svg = document.getElementById('site-map');
  svg.innerHTML = `
    <defs>
      <pattern id="reflect-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" stroke-width="2" stroke-opacity="0.5"></line>
      </pattern>
    </defs>
  `;
  Object.entries(zoneGeometry).forEach(([zone, geo]) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'zone');
    rect.setAttribute('data-zone', zone);
    rect.setAttribute('x', geo.x);
    rect.setAttribute('y', geo.y);
    rect.setAttribute('width', geo.width);
    rect.setAttribute('height', geo.height);
    svg.appendChild(rect);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'zone-tag');
    label.setAttribute('x', geo.x + 6);
    label.setAttribute('y', geo.y + 12);
    label.textContent = zoneLabels[zone];
    svg.appendChild(label);
  });

  svg.querySelectorAll('.zone').forEach((el) => {
    el.addEventListener('mouseenter', () => showZoneDetail(el.dataset.zone));
    el.addEventListener('click', () => showZoneDetail(el.dataset.zone));
  });
}

function renderOverlays(interventions) {
  const svg = document.getElementById('site-map');
  svg.querySelectorAll('.overlay').forEach((el) => el.remove());

  if (interventions.includes('trees')) {
    treeSpots.forEach((spot) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'overlay');
      c.setAttribute('cx', spot.cx);
      c.setAttribute('cy', spot.cy);
      c.setAttribute('r', spot.r);
      c.setAttribute('fill', '#3e7c6c');
      c.setAttribute('stroke', '#1c231f');
      c.setAttribute('stroke-width', '0.75');
      svg.appendChild(c);
    });
  }

  if (interventions.includes('shade')) {
    shadeSpots.forEach((spot) => {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('class', 'overlay');
      r.setAttribute('x', spot.x);
      r.setAttribute('y', spot.y);
      r.setAttribute('width', spot.width);
      r.setAttribute('height', spot.height);
      r.setAttribute('fill', 'none');
      r.setAttribute('stroke', '#eef1ea');
      r.setAttribute('stroke-width', '1.5');
      r.setAttribute('stroke-dasharray', '4 3');
      svg.appendChild(r);
    });
  }

  if (interventions.includes('reflect')) {
    ['parkingLot', 'road', 'rooftop'].forEach((zone) => {
      const geo = zoneGeometry[zone];
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('class', 'overlay');
      r.setAttribute('x', geo.x);
      r.setAttribute('y', geo.y);
      r.setAttribute('width', geo.width);
      r.setAttribute('height', geo.height);
      r.setAttribute('fill', 'url(#reflect-hatch)');
      r.setAttribute('pointer-events', 'none');
      svg.appendChild(r);
    });
  }
}

let selectedZone = null;

function showZoneDetail(zone) {
  selectedZone = zone;
  const interventions = activeInterventions();
  const { zones } = computeZoneTemps(state.location, state.time, interventions);
  const temp = zones[zone];
  document.getElementById('field-notes-text').textContent = zoneNote(zone, temp, interventions);
}

function zoneNote(zone, temp, interventions) {
  const name = zoneLabels[zone].toLowerCase();
  if (zone === 'park') {
    return `${zoneLabels[zone]} is running about ${temp}°C, close to ambient air temperature — this is the coolest surface on the block.`;
  }
  const risk = riskFromTemp(temp);
  const helped = interventions.length > 0
    ? ` Current interventions are already reducing this surface.`
    : ` No interventions are active for this surface yet.`;
  return `${zoneLabels[zone]} is at ${temp}°C (${risk.label.toLowerCase()} risk).${helped}`;
}

function buildLegend() {
  const legend = document.getElementById('legend');
  const entries = [
    ['Low, under 30°C', 15],
    ['Moderate, 30–42°C', 34],
    ['High, 42–52°C', 46],
    ['Extreme, over 52°C', 56]
  ];
  legend.innerHTML = entries.map(([text, sample]) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${rgbToHex(tempToColor(sample))}"></span>
      ${text}
    </span>
  `).join('');
}

function update() {
  const interventions = activeInterventions();
  const current = computeZoneTemps(state.location, state.time, interventions);
  const baseline = computeZoneTemps(state.location, state.time, []);

  const exposedZones = ['parkingLot', 'road', 'sidewalk', 'rooftop'];
  const hottestZone = exposedZones.reduce((a, b) => (current.zones[a] > current.zones[b] ? a : b));
  const hottestTemp = current.zones[hottestZone];
  const baselineHottest = Math.max(...exposedZones.map((z) => baseline.zones[z]));
  const delta = Math.round((baselineHottest - hottestTemp) * 10) / 10;

  document.getElementById('temp-display').textContent = `${hottestTemp}°C`;
  document.getElementById('temp-zone-sub').textContent = zoneLabels[hottestZone];

  const risk = riskFromTemp(hottestTemp);
  const riskDisplay = document.getElementById('risk-display');
  riskDisplay.textContent = risk.label;
  riskDisplay.style.color = risk.color;
  document.getElementById('risk-sub').textContent = `Ambient air ${current.ambient}°C`;

  const deltaDisplay = document.getElementById('delta-display');
  if (interventions.length === 0) {
    deltaDisplay.textContent = '0.0°C';
    document.getElementById('delta-sub').textContent = 'No interventions active';
  } else {
    deltaDisplay.textContent = `-${delta}°C`;
    document.getElementById('delta-sub').textContent = `${interventions.length} intervention${interventions.length > 1 ? 's' : ''} active`;
  }

  Object.entries(current.zones).forEach(([zone, temp]) => {
    const el = document.querySelector(`.zone[data-zone="${zone}"]`);
    if (el) el.setAttribute('fill', rgbToHex(tempToColor(temp)));
  });

  renderOverlays(interventions);

  const zoneToShow = selectedZone || hottestZone;
  document.getElementById('field-notes-text').textContent = zoneNote(zoneToShow, current.zones[zoneToShow], interventions);

  document.getElementById('location-hint').textContent = locations[state.location].hint;
}

function init() {
  buildMapSvg();
  buildLegend();

  document.getElementById('location-select').addEventListener('change', (e) => {
    state.location = e.target.value;
    selectedZone = null;
    update();
  });

  document.querySelectorAll('.seg-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-option').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.time = btn.dataset.time;
      update();
    });
  });

  document.getElementById('toggle-trees').addEventListener('change', (e) => {
    state.trees = e.target.checked;
    update();
  });
  document.getElementById('toggle-shade').addEventListener('change', (e) => {
    state.shade = e.target.checked;
    update();
  });
  document.getElementById('toggle-reflect').addEventListener('change', (e) => {
    state.reflect = e.target.checked;
    update();
  });

  update();
}

document.addEventListener('DOMContentLoaded', init);
