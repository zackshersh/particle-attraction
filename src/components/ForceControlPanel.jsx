import React, { useState } from 'react';
import './ForceControlPanel.css';

const MAX_FORCE = 0.3;
const TRACK_BASE = '#1e1e2e';
const ATTRACT_COLOR = 'rgba(70, 210, 105, 0.9)';
const REPEL_COLOR = 'rgba(220, 75, 75, 0.9)';

function buildTrackGradient(displayValue, inverted) {
    const pct = ((displayValue + MAX_FORCE) / (2 * MAX_FORCE)) * 100;
    const mid = 50;
    const leftColor  = inverted ? ATTRACT_COLOR : REPEL_COLOR;
    const rightColor = inverted ? REPEL_COLOR   : ATTRACT_COLOR;

    if (displayValue >= 0) {
        return `linear-gradient(to right,
            ${TRACK_BASE} 0%,
            ${TRACK_BASE} ${mid}%,
            ${rightColor} ${mid}%,
            ${rightColor} ${pct}%,
            ${TRACK_BASE} ${pct}%,
            ${TRACK_BASE} 100%)`;
    } else {
        return `linear-gradient(to right,
            ${TRACK_BASE} 0%,
            ${TRACK_BASE} ${pct}%,
            ${leftColor} ${pct}%,
            ${leftColor} ${mid}%,
            ${TRACK_BASE} ${mid}%,
            ${TRACK_BASE} 100%)`;
    }
}

function ForceSlider({ value, onChange, inverted, thumbColor }) {
    const displayValue = inverted ? -value : value;

    return (
        <div className="force-slider-wrap">
            <input
                type="range"
                className="force-slider"
                min={-MAX_FORCE}
                max={MAX_FORCE}
                step={0.005}
                value={displayValue}
                onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange(inverted ? -v : v);
                }}
                style={{
                    background: buildTrackGradient(displayValue, inverted),
                    '--thumb-color': thumbColor,
                }}
            />
        </div>
    );
}

function ParamSlider({ label, value, min, max, step, onChange, format }) {
    return (
        <div className="param-row">
            <div className="param-label-row">
                <span className="param-label">{label}</span>
                <span className="param-value">{format ? format(value) : value}</span>
            </div>
            <div className="force-slider-wrap">
                <input
                    type="range"
                    className="force-slider param-slider"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    style={{ background: TRACK_BASE, '--thumb-color': '#8888cc' }}
                />
            </div>
        </div>
    );
}

const REL_THRESHOLD = 0.015;

function RelationshipIcon({ forceBA, forceAB }) {
    const aIn  = forceBA >  REL_THRESHOLD;
    const aOut = forceBA < -REL_THRESHOLD;
    const bIn  = forceAB >  REL_THRESHOLD;
    const bOut = forceAB < -REL_THRESHOLD;

    const leftColor  = aIn ? '#46D269' : aOut ? '#DC4B4B' : '#444';
    const rightColor = bIn ? '#46D269' : bOut ? '#DC4B4B' : '#444';

    return (
        <svg className="rel-icon" viewBox="0 0 24 10" fill="none">
            {aIn  && <path d="M10,5 L4,2 L4,8 Z"   fill={leftColor} />}
            {aOut && <path d="M2,5 L8,2 L8,8 Z"    fill={leftColor} />}
            {!aIn && !aOut && <line x1="3" y1="5" x2="9" y2="5" stroke={leftColor} strokeWidth="1.5" />}

            {bIn  && <path d="M14,5 L20,2 L20,8 Z"  fill={rightColor} />}
            {bOut && <path d="M22,5 L16,2 L16,8 Z"  fill={rightColor} />}
            {!bIn && !bOut && <line x1="15" y1="5" x2="21" y2="5" stroke={rightColor} strokeWidth="1.5" />}
        </svg>
    );
}

export default function ForceControlPanel({
    types, forces, onForceChange,
    scenarioId, scenarioCount, scenarioLabel, onScenarioChange,
    countPerType, onCountPerTypeChange,
    maxForceDistance, onMaxForceDistanceChange,
    forceStrength, onForceStrengthChange,
}) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(new Set());

    const toggleColor = (i) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(i) ? next.delete(i) : next.add(i);
        return next;
    });

    const allPairs = [];
    for (let i = 0; i < types.length; i++) {
        for (let j = i + 1; j < types.length; j++) {
            allPairs.push([i, j]);
        }
    }

    const pairs = selected.size === 0
        ? allPairs
        : selected.size === 1
            ? allPairs.filter(([i, j]) => selected.has(i) || selected.has(j))
            : allPairs.filter(([i, j]) => selected.has(i) && selected.has(j));

    const selfIndices = selected.size === 0
        ? types.map((_, i) => i)
        : types.map((_, i) => i).filter((i) => selected.has(i));

    return (
        <div className="force-panel">
            <button className="force-panel-toggle" onClick={() => setOpen((o) => !o)}>
                {open ? '✕  Settings' : '⚙  Settings'}
            </button>

            {open && (
                <div className="force-panel-body">

                    {/* ── Scenario switcher ── */}
                    <div className="scenario-switcher">
                        <button
                            className="scenario-arrow"
                            disabled={scenarioId === 0}
                            onClick={() => onScenarioChange(scenarioId - 1)}
                        >◀</button>
                        <span className="scenario-label">{scenarioLabel}</span>
                        <button
                            className="scenario-arrow"
                            disabled={scenarioId === scenarioCount - 1}
                            onClick={() => onScenarioChange(scenarioId + 1)}
                        >▶</button>
                    </div>
                    <div className="scenario-dots">
                        {Array.from({ length: scenarioCount }, (_, i) => (
                            <button
                                key={i}
                                className={`scenario-dot${i === scenarioId ? ' active' : ''}`}
                                onClick={() => onScenarioChange(i)}
                            />
                        ))}
                    </div>

                    <div className="force-panel-divider" />

                    {/* ── Parameters ── */}
                    <ParamSlider
                        label="Particles per type"
                        value={countPerType}
                        min={10} max={500} step={10}
                        onChange={onCountPerTypeChange}
                        format={(v) => Math.round(v)}
                    />
                    <ParamSlider
                        label="Force distance"
                        value={maxForceDistance}
                        min={20} max={300} step={5}
                        onChange={onMaxForceDistanceChange}
                        format={(v) => `${Math.round(v)} px`}
                    />
                    <ParamSlider
                        label="Force strength"
                        value={forceStrength}
                        min={0.05} max={5} step={0.05}
                        onChange={onForceStrengthChange}
                        format={(v) => v.toFixed(2)}
                    />

                    <div className="force-panel-divider" />

                    {/* ── Type filter ── */}
                    <div className="force-panel-filter">
                        <button
                            className={`filter-dot filter-dot-all${selected.size === 0 ? ' active' : ''}`}
                            onClick={() => setSelected(new Set())}
                            title="Show all"
                        >
                            All
                        </button>
                        {types.map((type, i) => {
                            const color = `rgb(${type.color.join(',')})`;
                            return (
                                <button
                                    key={i}
                                    className={`filter-dot${selected.has(i) ? ' active' : ''}`}
                                    style={{ '--dot-color': color }}
                                    onClick={() => toggleColor(i)}
                                    title={`Filter by color ${i + 1}`}
                                />
                            );
                        })}
                    </div>

                    <div className="force-panel-legend">
                        <span className="legend-attract">■ attract</span>
                        <span className="legend-repel">■ repel</span>
                    </div>

                    {pairs.map(([i, j]) => {
                        const A = types[i];
                        const B = types[j];
                        const colorA = `rgb(${A.color.join(',')})`;
                        const colorB = `rgb(${B.color.join(',')})`;
                        return (
                            <div key={`${i}-${j}`} className="pair-row">
                                <ForceSlider
                                    value={forces[j][i]}
                                    inverted={false}
                                    thumbColor={colorA}
                                    onChange={(v) => onForceChange(j, i, v)}
                                />
                                <RelationshipIcon forceBA={forces[j][i]} forceAB={forces[i][j]} />
                                <ForceSlider
                                    value={forces[i][j]}
                                    inverted={true}
                                    thumbColor={colorB}
                                    onChange={(v) => onForceChange(i, j, v)}
                                />
                            </div>
                        );
                    })}

                    <div className="force-panel-divider" />

                    <button
                        className="force-panel-log-btn"
                        onClick={() => {
                            const rounded = forces.map(row => row.map(v => parseFloat(v.toFixed(4))));
                            console.log(JSON.stringify(rounded));
                        }}
                    >
                        Log Forces
                    </button>

                    <div className="force-panel-divider" />

                    {selfIndices.map((i) => {
                        const color = `rgb(${types[i].color.join(',')})`;
                        return (
                            <div key={`self-${i}`} className="pair-row">
                                <ForceSlider
                                    value={forces[i][i]}
                                    inverted={false}
                                    thumbColor={color}
                                    onChange={(v) => onForceChange(i, i, v)}
                                />
                                <ForceSlider
                                    value={forces[i][i]}
                                    inverted={true}
                                    thumbColor={color}
                                    onChange={(v) => onForceChange(i, i, v)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
