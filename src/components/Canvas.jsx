import React, { useRef, useState, useCallback } from 'react';
import ParticleCanvasManager, { PARTICLE_SCENARIOS } from '../scripts/ParticleCanvasManager.jsx';
import ForceControlPanel from './ForceControlPanel.jsx';
import RelationshipGraph from './RelationshipGraph.jsx';

const SCENARIO_COUNT = Object.keys(PARTICLE_SCENARIOS).length;

function deepCopy2D(matrix) {
    return matrix.map((row) => [...row]);
}

const hideUI = new URLSearchParams(window.location.search).get('hideUI') !== null;

function Canvas() {
    const containerRef = useRef(null);
    const canvasManagerRef = useRef(null);
    const savedForcesRef = useRef(null);

    const [scenarioId, setScenarioId] = useState(0);
    const [forces, setForces] = useState(() => deepCopy2D(PARTICLE_SCENARIOS[0].forces));
    const [countPerType, setCountPerType] = useState(PARTICLE_SCENARIOS[0].countPerType);
    const [maxForceDistance, setMaxForceDistance] = useState(PARTICLE_SCENARIOS[0].maxForceDistance);
    const [forceStrength, setForceStrength] = useState(PARTICLE_SCENARIOS[0].forceStrength);
    const [scale, setScale] = useState(PARTICLE_SCENARIOS[0].scale ?? 1);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const mgr = new ParticleCanvasManager(containerRef, scenarioId);
        canvasManagerRef.current = mgr;
        const sc = PARTICLE_SCENARIOS[scenarioId];
        setForces(deepCopy2D(sc.forces));
        setCountPerType(sc.countPerType);
        setMaxForceDistance(sc.maxForceDistance);
        setForceStrength(sc.forceStrength);
        setScale(sc.scale ?? 1);
        savedForcesRef.current = null;
        return () => {
            mgr.p5Instance?.remove();
        };
    }, [scenarioId]);

    const handleForceChange = useCallback((i, j, val) => {
        canvasManagerRef.current?.updateForce(i, j, val);
        setForces((prev) => {
            const next = deepCopy2D(prev);
            next[i][j] = val;
            return next;
        });
    }, []);

    const handleCountPerTypeChange = useCallback((n) => {
        canvasManagerRef.current?.updateCountPerType(n);
        setCountPerType(n);
    }, []);

    const handleMaxForceDistanceChange = useCallback((v) => {
        canvasManagerRef.current?.updateMaxForceDistance(v);
        setMaxForceDistance(v);
    }, []);

    const handleForceStrengthChange = useCallback((v) => {
        canvasManagerRef.current?.updateForceStrength(v);
        setForceStrength(v);
    }, []);

    const handleScaleChange = useCallback((v) => {
        canvasManagerRef.current?.updateScale(v);
        setScale(v);
    }, []);

    const handleMouseDown = useCallback(() => {
        canvasManagerRef.current?.setNoiseForceActive(true);
        setForces((prev) => {
            savedForcesRef.current = deepCopy2D(prev);
            const next = prev.map((row, i) =>
                row.map((_val, j) => {
                    const repulsive = -0.1;
                    canvasManagerRef.current?.updateForce(i, j, repulsive);
                    return repulsive;
                })
            );
            return next;
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        canvasManagerRef.current?.setNoiseForceActive(false);
        const saved = savedForcesRef.current;
        if (!saved) return;
        saved.forEach((row, i) => {
            row.forEach((val, j) => {
                canvasManagerRef.current?.updateForce(i, j, val);
            });
        });
        setForces(saved);
        savedForcesRef.current = null;
    }, []);

    const scenario = PARTICLE_SCENARIOS[scenarioId];

    return (
        <>
            <div ref={containerRef} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} style={{ overflow: 'hidden', height: "100vh" }} />
            {!hideUI && (
                <ForceControlPanel
                    key={scenarioId}
                    types={scenario.types}
                    forces={forces}
                    onForceChange={handleForceChange}
                    scenarioId={scenarioId}
                    scenarioCount={SCENARIO_COUNT}
                    scenarioLabel={scenario.label}
                    onScenarioChange={setScenarioId}
                    countPerType={countPerType}
                    onCountPerTypeChange={handleCountPerTypeChange}
                    maxForceDistance={maxForceDistance}
                    onMaxForceDistanceChange={handleMaxForceDistanceChange}
                    forceStrength={forceStrength}
                    onForceStrengthChange={handleForceStrengthChange}
                    scale={scale}
                    onScaleChange={handleScaleChange}
                />
            )}
            {!hideUI && (
                <RelationshipGraph
                    key={`rg-${scenarioId}`}
                    types={scenario.types}
                    forces={forces}
                />
            )}
        </>
    );
}

export default Canvas;
