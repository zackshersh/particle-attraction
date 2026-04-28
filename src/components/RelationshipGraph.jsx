import { useEffect, useRef, useCallback, useState } from 'react';
import './RelationshipGraph.css';

const MAX_FORCE = 0.3;
const REL_THRESHOLD = 0.015;
const NODE_RADIUS = 12;
const DAMPING = 0.88;
const REPULSION = 3500;
const CENTER_PULL = 0.004;
const SPRING_REST = 80;
const MUTUAL_ATTRACT_REST = NODE_RADIUS * 2 + 40; // near-contact for mutually attracted nodes
const STIFFNESS_SCALE = 0.06;
const MUTUAL_ATTRACT_SCALE = 25;
const GREEN = '#46D269';
const RED  = '#DC4B4B';

function getEdge(forces, i, j) {
    const ba = forces[j][i];
    const ab = forces[i][j];

    if (ba < -REL_THRESHOLD && ab < -REL_THRESHOLD) return null;

    const absBA = Math.abs(ba);
    const absAB = Math.abs(ab);
    if (absBA + absAB < REL_THRESHOLD) return null;

    const visualStrength = (absBA + absAB) / (2 * MAX_FORCE);

    if (ba > REL_THRESHOLD && ab > REL_THRESHOLD) {
        const springStrength = ((ba + ab) / (2 * MAX_FORCE)) * MUTUAL_ATTRACT_SCALE;
        return { springStrength, visualStrength, type: 'attract', restLength: MUTUAL_ATTRACT_REST };
    }

    const attracted = Math.max(ba, ab, 0);
    const repelled  = Math.abs(Math.min(ba, ab, 0));
    const springStrength = Math.max(0, attracted - repelled) / MAX_FORCE;

    const colorA = ba >= 0 ? GREEN : RED;
    const colorB = ab >= 0 ? GREEN : RED;
    const t = absBA / (absBA + absAB);
    return { springStrength, visualStrength, type: 'asymmetric', colorA, colorB, t, restLength: SPRING_REST };
}

function GraphCanvas({ types, forces }) {
    const canvasRef = useRef(null);
    const nodesRef  = useRef(null);
    const forcesRef = useRef(forces);
    const dragRef   = useRef(null);

    forcesRef.current = forces;

    useEffect(() => {
        const canvas = canvasRef.current;
        const W = canvas.width;
        const H = canvas.height;
        const N = types.length;

        nodesRef.current = types.map((type, i) => {
            const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
            const r = Math.min(W, H) * 0.28;
            return {
                x: W / 2 + r * Math.cos(angle),
                y: H / 2 + r * Math.sin(angle),
                vx: 0, vy: 0,
                color: `rgb(${type.color.join(',')})`,
            };
        });

        const ctx = canvas.getContext('2d');
        let animId;

        const tick = () => {
            const f     = forcesRef.current;
            const nodes = nodesRef.current;
            const n     = nodes.length;
            const fx    = new Array(n).fill(0);
            const fy    = new Array(n).fill(0);

            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const dx   = nodes[j].x - nodes[i].x;
                    const dy   = nodes[j].y - nodes[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const ux   = dx / dist;
                    const uy   = dy / dist;

                    const rep = REPULSION / (dist * dist);
                    fx[i] -= rep * ux;  fy[i] -= rep * uy;
                    fx[j] += rep * ux;  fy[j] += rep * uy;

                    const edge = getEdge(f, i, j);
                    if (edge) {
                        const sf = STIFFNESS_SCALE * edge.springStrength * (dist - edge.restLength);
                        fx[i] += sf * ux;  fy[i] += sf * uy;
                        fx[j] -= sf * ux;  fy[j] -= sf * uy;
                    }
                }

                fx[i] += (W / 2 - nodes[i].x) * CENTER_PULL;
                fy[i] += (H / 2 - nodes[i].y) * CENTER_PULL;
            }

            for (let i = 0; i < n; i++) {
                if (dragRef.current?.idx === i) continue;
                nodes[i].vx = (nodes[i].vx + fx[i]) * DAMPING;
                nodes[i].vy = (nodes[i].vy + fy[i]) * DAMPING;
                nodes[i].x  = Math.max(NODE_RADIUS, Math.min(W - NODE_RADIUS, nodes[i].x + nodes[i].vx));
                nodes[i].y  = Math.max(NODE_RADIUS, Math.min(H - NODE_RADIUS, nodes[i].y + nodes[i].vy));
            }

            ctx.clearRect(0, 0, W, H);

            ctx.globalAlpha = 0.6;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const edge = getEdge(f, i, j);
                    if (!edge) continue;

                    const ax = nodes[i].x, ay = nodes[i].y;
                    const bx = nodes[j].x, by = nodes[j].y;
                    ctx.lineWidth = 1.5 + edge.visualStrength * 4;

                    if (edge.type === 'attract') {
                        ctx.strokeStyle = GREEN;
                        ctx.beginPath();
                        ctx.moveTo(ax, ay);
                        ctx.lineTo(bx, by);
                        ctx.stroke();
                    } else {
                        const mx = ax + (bx - ax) * edge.t;
                        const my = ay + (by - ay) * edge.t;

                        ctx.strokeStyle = edge.colorA;
                        ctx.beginPath();
                        ctx.moveTo(ax, ay);
                        ctx.lineTo(mx, my);
                        ctx.stroke();

                        ctx.strokeStyle = edge.colorB;
                        ctx.beginPath();
                        ctx.moveTo(mx, my);
                        ctx.lineTo(bx, by);
                        ctx.stroke();
                    }
                }
            }

            ctx.globalAlpha = 1;
            for (let i = 0; i < n; i++) {
                ctx.beginPath();
                ctx.arc(nodes[i].x, nodes[i].y, NODE_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = nodes[i].color;
                ctx.fill();
            }

            animId = requestAnimationFrame(tick);
        };

        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [types]);

    const onMouseDown = useCallback((e) => {
        const rect  = canvasRef.current.getBoundingClientRect();
        const mx    = e.clientX - rect.left;
        const my    = e.clientY - rect.top;
        const nodes = nodesRef.current;
        if (!nodes) return;
        for (let i = 0; i < nodes.length; i++) {
            const dx = nodes[i].x - mx;
            const dy = nodes[i].y - my;
            if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
                dragRef.current = { idx: i };
                return;
            }
        }
    }, []);

    const onMouseMove = useCallback((e) => {
        if (!dragRef.current) return;
        const rect  = canvasRef.current.getBoundingClientRect();
        const nodes = nodesRef.current;
        const { idx } = dragRef.current;
        nodes[idx].x  = e.clientX - rect.left;
        nodes[idx].y  = e.clientY - rect.top;
        nodes[idx].vx = 0;
        nodes[idx].vy = 0;
    }, []);

    const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={340}
            className="rel-graph-canvas"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        />
    );
}

export default function RelationshipGraph({ types, forces }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rel-graph-panel">
            <button className="rel-graph-toggle" onClick={() => setOpen((o) => !o)}>
                {open ? '✕  Map' : '◎  Map'}
            </button>

            {open && (
                <div className="rel-graph-body">
                    <GraphCanvas types={types} forces={forces} />
                </div>
            )}
        </div>
    );
}
