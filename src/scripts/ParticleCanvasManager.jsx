import p5 from "p5";

// ─── Scenario authoring ───────────────────────────────────────────────────────
// types:        array of { name, color: [r,g,b] }
// countPerType: uniform particle count per type (tuned for 1920×1080)
// forces:       2-D matrix where forces[i][j] is the force exerted by particles
//               of type i ON particles of type j.
//                 positive → type i attracts type j
//                 negative → type i repels  type j
// maxForceDistance: radius in px beyond which forces are zero
// minDistance:      inner radius below which a universal hard repulsion kicks in
// friction:         velocity multiplier per frame  (0..1; lower = more damping)
// forceStrength:    global scalar applied to all forces

const PARTICLE_SCENARIOS = {
    0: {
        label: 'Classic',
        types: [
            { name: 'red',    color: [255,  70,  70] },
            { name: 'green',  color: [ 70, 220,  70] },
            { name: 'blue',   color: [ 60, 120, 255] },
            { name: 'yellow', color: [255, 230,  40] },
            { name: 'pink',   color: [255,  80, 200] },
        ],
        countPerType: 300,
        forces: [
            //            red    green   blue   yellow   pink
            /* red    */ [ 0.1,  0.18,  -0.08,   0.06,  0.09 ],
            /* green  */ [-0.12,  0.11,  0.10,   0.09,  0.07 ],
            /* blue   */ [ 0.11, -0.12,  0.02,  -0.09, -0.08 ],
            /* yellow */ [ 0.12, -0.14,  0.12,   0.11,  0.13 ],
            /* pink   */ [-0.09, -0.09, -0.07,  -0.13,  0.016],
        ],
        maxForceDistance: 60,
        extendedMaxForceDistance: 160,
        isolationTime: 50,
        minDistance: 12,
        friction: 0.88,
        forceStrength: 2,
        scale: 1,
    },
    1: {
        label: 'Complex',
        types: [
            { name: 'red',    color: [255,  70,  70] },
            { name: 'green',  color: [ 70, 220,  70] },
            { name: 'blue',   color: [ 60, 120, 255] },
            { name: 'yellow', color: [255, 230,  40] },
            { name: 'pink',   color: [255,  80, 200] },
            { name: 'cyan',   color: [ 40, 220, 220] },
            { name: 'orange', color: [255, 140,  30] },
            { name: 'white',  color: [220, 220, 220] },
        ],
        countPerType: 100,
        forces: [
            //            red    green   blue   yellow   pink   cyan   orange  white
            /* red    */ [ 0.10,  0.18, -0.08,   0.06,  0.09,  0.10, -0.08,  0.07 ],
            /* green  */ [-0.12,  0.11,  0.10,   0.09,  0.07,  0.09, -0.11,  0.06 ],
            /* blue   */ [ 0.11, -0.12,  0.02,  -0.09, -0.08, -0.07,  0.09, -0.08 ],
            /* yellow */ [ 0.12, -0.14,  0.12,   0.11,  0.13,  0.11,  0.13, -0.09 ],
            /* pink   */ [-0.09, -0.09, -0.07,  -0.13,  0.02, -0.10,  0.07,  0.11 ],
            /* cyan   */ [-0.09, -0.08,  0.12,  -0.08,  0.08,  0.09, -0.11, -0.10 ],
            /* orange */ [ 0.11,  0.08, -0.10,   0.09, -0.12, -0.11,  0.10,  0.08 ],
            /* white  */ [-0.10,  0.10, -0.09,   0.07, -0.08,  0.07, -0.09,  0.08 ],
        ],
        maxForceDistance: 60,
        extendedMaxForceDistance: 160,
        isolationTime: 50,
        minDistance: 12,
        friction: 0.88,
        forceStrength: 2,
        scale: 1,
    },
    2: {
        label: 'Clusters',
        types: [
            { name: 'red',    color: [255,  70,  70] },
            { name: 'green',  color: [ 70, 220,  70] },
            { name: 'blue',   color: [ 60, 120, 255] },
            { name: 'yellow', color: [255, 230,  40] },
            { name: 'pink',   color: [255,  80, 200] },
        ],
        countPerType: 300,
        forces: [
            [0.045,-0.065,0.06,0.06,0.09],
            [0.095,0.065,-0.06,-0.04,-0.06],
            [-0.12,0.075,0.04,0.055,-0.065],
            [-0.075,-0.04,0.12,0.065,0.075],
            [0.075,0.06,-0.035,0.07,0.045],
        ],
        maxForceDistance: 60,
        extendedMaxForceDistance: 160,
        isolationTime: 50,
        minDistance: 12,
        friction: 0.88,
        forceStrength: 2,
        scale: 1,
    },
    3: {
        label: 'Binary',
        types: [
            { name: 'orange', color: [255, 140,  20] },
            { name: 'teal',   color: [ 20, 200, 180] },
        ],
        countPerType: 200,
        forces: [
            //              orange  teal
            /* orange */  [  0.08,  0.14 ],
            /* teal   */  [ -0.14,  0.08 ],
        ],
        maxForceDistance: 150,
        extendedMaxForceDistance: 320,
        isolationTime: 150,
        minDistance: 8,
        friction: 0.92,
        forceStrength: 0.40,
        scale: 1,
    },
};

// ─── Force kernel ─────────────────────────────────────────────────────────────
function forceKernel(r, coeff, maxDist, minDist) {
    if (r < minDist) {
        return -2.0 * (1.0 - r / minDist);
    }
    if (r >= maxDist) return 0;
    const t = (r - minDist) / (maxDist - minDist);
    return coeff * (1.0 - t);
}

const REFERENCE_AREA = 1920 * 1080;

// ─── ParticleAttractionCanvasManager ─────────────────────────────────────────
class ParticleCanvasManager {
    constructor(containerRef, arg) {
        const scenario = PARTICLE_SCENARIOS[arg] ?? PARTICLE_SCENARIOS[0];
        // Deep-copy the scenario so live edits don't mutate the source data
        this._scenario = {
            ...scenario,
            types: scenario.types.map(t => ({ ...t })),
            forces: scenario.forces.map(row => [...row]),
        };
        this._particles = [];
        this._lastW = 0;
        this._lastH = 0;

        this.sketch = (p) => {
            p.setup = () => {
                p.createCanvas(window.innerWidth, window.innerHeight);
                this._spawnParticles(p.width, p.height);
            };

            p.windowResized = () => {
                p.resizeCanvas(window.innerWidth, window.innerHeight);
                this._spawnParticles(p.width, p.height);
            };

            p.draw = () => {
                p.background(12, 12, 18);
                this._updatePhysics(p.width, p.height);
                this._drawParticles(p);
            };
        };

        this._noiseForceActive = false;
        this._noiseTime = 0;

        this.noiseForceMagnitude = 0.1;
        this.noiseForceScale = 200;

        this._grid = null;
        this._gridCols = 0;
        this._gridRows = 0;

        this.p5Instance = new p5(this.sketch, containerRef.current);
    }

    setNoiseForceActive(active) {
        this._noiseForceActive = active;
    }

    get types() {
        return this._scenario.types;
    }

    updateForce(i, j, val) {
        this._scenario.forces[i][j] = val;
    }

    updateCountPerType(n) {
        this._scenario.countPerType = n;
        if (this._lastW) this._spawnParticles(this._lastW, this._lastH);
    }

    updateMaxForceDistance(v) {
        const ratio = this._scenario.extendedMaxForceDistance / this._scenario.maxForceDistance;
        this._scenario.maxForceDistance = v;
        this._scenario.extendedMaxForceDistance = v * ratio;
        // Grid will be rebuilt next frame automatically
        this._grid = null;
    }

    updateForceStrength(v) {
        this._scenario.forceStrength = v;
    }

    // ── Particle spawning ─────────────────────────────────────────────────────

    _spawnParticles(w, h) {
        this._lastW = w;
        this._lastH = h;
        this._particles = [];
        const { types, countPerType, scale = 1 } = this._scenario;
        const areaScale = (w * h) / REFERENCE_AREA;
        const count = Math.max(1, Math.round(countPerType * areaScale / (scale * scale)));
        types.forEach((_type, typeIndex) => {
            for (let k = 0; k < count; k++) {
                this._particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: 0,
                    vy: 0,
                    typeIndex,
                    isolationFrames: 0,
                });
            }
        });
    }

    // ── Physics ───────────────────────────────────────────────────────────────

    _updatePhysics(W, H) {
        const { forces, maxForceDistance, extendedMaxForceDistance, isolationTime, minDistance, friction, forceStrength, scale = 1 } = this._scenario;
        const scaledMaxDist      = maxForceDistance      * scale;
        const scaledExtendedDist = extendedMaxForceDistance * scale;
        const scaledMinDist      = minDistance           * scale;
        const scaledForce        = forceStrength         * scale;
        const particles = this._particles;
        const n = particles.length;
        const halfW = W * 0.5;
        const halfH = H * 0.5;

        const cellSize = scaledMaxDist;
        const cols = Math.max(1, Math.ceil(W / cellSize));
        const rows = Math.max(1, Math.ceil(H / cellSize));
        const totalCells = cols * rows;

        if (!this._grid || this._gridCols !== cols || this._gridRows !== rows) {
            this._grid = Array.from({ length: totalCells }, () => []);
            this._gridCols = cols;
            this._gridRows = rows;
        } else {
            for (let i = 0; i < totalCells; i++) this._grid[i].length = 0;
        }

        for (let i = 0; i < n; i++) {
            const p = particles[i];
            const col = Math.min(Math.floor(p.x / cellSize), cols - 1);
            const row = Math.min(Math.floor(p.y / cellSize), rows - 1);
            this._grid[row * cols + col].push(i);
        }

        const isolatedSearchRadius = Math.ceil(scaledExtendedDist / cellSize);
        const maxDist2 = scaledMaxDist * scaledMaxDist;

        for (let a = 0; a < n; a++) {
            const pa = particles[a];
            const isIsolated = pa.isolationFrames >= isolationTime;
            const effectiveDist = isIsolated ? scaledExtendedDist : scaledMaxDist;
            const effectiveDist2 = effectiveDist * effectiveDist;
            const searchRadius = isIsolated ? isolatedSearchRadius : 1;

            let fx = 0;
            let fy = 0;
            let hasNeighbor = false;

            const aCol = Math.min(Math.floor(pa.x / cellSize), cols - 1);
            const aRow = Math.min(Math.floor(pa.y / cellSize), rows - 1);

            for (let dr = -searchRadius; dr <= searchRadius; dr++) {
                for (let dc = -searchRadius; dc <= searchRadius; dc++) {
                    const neighborRow = ((aRow + dr) % rows + rows) % rows;
                    const neighborCol = ((aCol + dc) % cols + cols) % cols;
                    const cell = this._grid[neighborRow * cols + neighborCol];

                    for (let ci = 0; ci < cell.length; ci++) {
                        const b = cell[ci];
                        if (a === b) continue;
                        const pb = particles[b];

                        let dx = pb.x - pa.x;
                        let dy = pb.y - pa.y;
                        if (dx > halfW) dx -= W;
                        else if (dx < -halfW) dx += W;
                        if (dy > halfH) dy -= H;
                        else if (dy < -halfH) dy += H;

                        const r2 = dx * dx + dy * dy;
                        if (r2 < maxDist2) hasNeighbor = true;
                        if (r2 === 0 || r2 >= effectiveDist2) continue;

                        const r = Math.sqrt(r2);
                        const coefficient = forces[pb.typeIndex][pa.typeIndex];
                        const f = forceKernel(r, coefficient, effectiveDist, scaledMinDist);

                        const inv = f / r;
                        fx += dx * inv;
                        fy += dy * inv;
                    }
                }
            }

            pa.isolationFrames = hasNeighbor ? 0 : pa.isolationFrames + 1;

            if (this._noiseForceActive) {
                const noiseVal = this.p5Instance.noise(pa.x / this.noiseForceScale, pa.y / this.noiseForceScale, this._noiseTime);
                const angle = this.p5Instance.map(noiseVal, 0, 1, 0, Math.PI * 20);
                fx += Math.cos(angle) * this.noiseForceMagnitude;
                fy += Math.sin(angle) * this.noiseForceMagnitude;
            }

            pa.vx = (pa.vx + fx * scaledForce) * friction;
            pa.vy = (pa.vy + fy * scaledForce) * friction;
        }

        if (this._noiseForceActive) this._noiseTime += 0.003;

        for (let a = 0; a < n; a++) {
            const pa = particles[a];
            pa.x = ((pa.x + pa.vx) % W + W) % W;
            pa.y = ((pa.y + pa.vy) % H + H) % H;
        }
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    _drawParticles(p) {
        const { types, scale = 1 } = this._scenario;
        p.noStroke();

        for (const particle of this._particles) {
            const [r, g, b] = types[particle.typeIndex].color;

            p.fill(r, g, b, 50);
            p.circle(particle.x, particle.y, 10 * scale);

            p.fill(r, g, b, 220);
            p.circle(particle.x, particle.y, 4 * scale);
        }
    }
}

export default ParticleCanvasManager;
export { PARTICLE_SCENARIOS };
