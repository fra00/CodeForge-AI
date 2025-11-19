import React, { useState, useMemo } from 'react';
import { useRoboticArmStore } from '../../store/useRoboticArmStore';
import { calculatePlanarFK, toDegrees, toRadians } from '../../lib/kinematics';
import Card from '../../components/ui/Card';
import CardHeader from '../../components/ui/CardHeader';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Box from '../../components/ui/Box';
import styles from './RoboticArmSimulator.module.css';

// Costanti per la visualizzazione SVG
const SVG_SIZE = 400;
const CENTER = SVG_SIZE / 2;
const SCALE = 1.5; // Scala per adattare le lunghezze (es. 100px) al canvas (400px)

/**
 * Converte le coordinate del mondo (cinematica) in coordinate SVG.
 * L'origine (0,0) del mondo è al centro del canvas SVG.
 * L'asse Y è invertito in SVG (Y cresce verso il basso).
 * @param {number} x - Coordinata X del mondo.
 * @param {number} y - Coordinata Y del mondo.
 * @returns {{x: number, y: number}} - Coordinate SVG.
 */
const worldToSvg = (x, y) => ({
  x: CENTER + x * SCALE,
  y: CENTER - y * SCALE, // Inverti l'asse Y
});

const RoboticArmSimulator = () => {
  const { L1, L2, theta1, theta2, targetX, targetY, isReachable, setAngles, setTarget, setLengths } = useRoboticArmStore();

  // Calcola la Cinematica Diretta (FK)
  const { joint1, endEffector } = useMemo(() => {
    const fkResult = calculatePlanarFK(L1, L2, theta1, theta2);
    return {
      joint1: worldToSvg(fkResult.joint1.x, fkResult.joint1.y),
      endEffector: worldToSvg(fkResult.endEffector.x, fkResult.endEffector.y),
    };
  }, [L1, L2, theta1, theta2]);

  // Stato locale per i controlli FK (angoli in gradi)
  const [fkTheta1, setFkTheta1] = useState(toDegrees(theta1).toFixed(2));
  const [fkTheta2, setFkTheta2] = useState(toDegrees(theta2).toFixed(2));

  // Stato locale per i controlli IK (coordinate)
  const [ikTargetX, setIkTargetX] = useState(targetX.toFixed(2));
  const [ikTargetY, setIkTargetY] = useState(targetY.toFixed(2));

  // Stato locale per le lunghezze
  const [length1, setLength1] = useState(L1.toFixed(2));
  const [length2, setLength2] = useState(L2.toFixed(2));

  const handleFkSubmit = (e) => {
    e.preventDefault();
    const newTheta1 = toRadians(parseFloat(fkTheta1));
    const newTheta2 = toRadians(parseFloat(fkTheta2));
    setAngles(newTheta1, newTheta2);
  };

  const handleIkSubmit = (e) => {
    e.preventDefault();
    setTarget(parseFloat(ikTargetX), parseFloat(ikTargetY));
  };

  const handleLengthSubmit = (e) => {
    e.preventDefault();
    setLengths(parseFloat(length1), parseFloat(length2));
  };

  // Posizione del giunto base (origine del mondo)
  const baseJoint = { x: CENTER, y: CENTER };

  return (
    <Box className={styles.simulatorContainer}>
      <Card>
        <CardHeader>Simulatore Braccio Robotico 2DOF (2D)</CardHeader>
      </Card>

      <div className={styles.content}>
        {/* Canvas di Visualizzazione */}
        <div className={styles.canvasContainer}>
          <svg className={styles.armSvg} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
            {/* Asse X e Y (opzionale, per riferimento) */}
            <line x1="0" y1={CENTER} x2={SVG_SIZE} y2={CENTER} stroke="var(--color-text-secondary)" strokeDasharray="4" />
            <line x1={CENTER} y1="0" x2={CENTER} y2={SVG_SIZE} stroke="var(--color-text-secondary)" strokeDasharray="4" />

            {/* Segmento 1 (Spalla -> Gomito) */}
            <line 
              x1={baseJoint.x} 
              y1={baseJoint.y} 
              x2={joint1.x} 
              y2={joint1.y} 
              className={styles.armSegment} 
            />

            {/* Segmento 2 (Gomito -> End-Effector) */}
            <line 
              x1={joint1.x} 
              y1={joint1.y} 
              x2={endEffector.x} 
              y2={endEffector.y} 
              className={styles.armSegment} 
            />

            {/* Giunto Base (Spalla) */}
            <circle cx={baseJoint.x} cy={baseJoint.y} r="8" className={styles.joint} />

            {/* Giunto 1 (Gomito) */}
            <circle cx={joint1.x} cy={joint1.y} r="8" className={styles.joint} />

            {/* End-Effector (Polso) */}
            <circle cx={endEffector.x} cy={endEffector.y} r="10" className={styles.endEffector} />

            {/* Target IK */}
            <circle 
              cx={worldToSvg(targetX, targetY).x} 
              cy={worldToSvg(targetX, targetY).y} 
              r="12" 
              className={isReachable ? styles.target : styles.unreachable} 
            />
          </svg>
        </div>

        {/* Controlli */}
        <div className={styles.controls}>
          <Card>
            <CardHeader>Cinematica Diretta (FK)</CardHeader>
            <form onSubmit={handleFkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input 
                id="fk-theta1" 
                label="Angolo Spalla (θ1, Gradi)" 
                type="number" 
                value={fkTheta1} 
                onChange={(e) => setFkTheta1(e.target.value)} 
                step="0.01"
              />
              <Input 
                id="fk-theta2" 
                label="Angolo Gomito (θ2, Gradi)" 
                type="number" 
                value={fkTheta2} 
                onChange={(e) => setFkTheta2(e.target.value)} 
                step="0.01"
              />
              <Button type="submit">Applica FK</Button>
            </form>
          </Card>

          <Card>
            <CardHeader>Cinematica Inversa (IK)</CardHeader>
            <form onSubmit={handleIkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input 
                id="ik-x" 
                label="Target X" 
                type="number" 
                value={ikTargetX} 
                onChange={(e) => setIkTargetX(e.target.value)} 
                step="0.01"
              />
              <Input 
                id="ik-y" 
                label="Target Y" 
                type="number" 
                value={ikTargetY} 
                onChange={(e) => setIkTargetY(e.target.value)} 
                step="0.01"
              />
              <Button type="submit" variant="secondary">Calcola IK</Button>
            </form>
            {isReachable ? (
              <div className={styles.infoBox}>
                Raggiungibile. Angoli calcolati: θ1={toDegrees(theta1).toFixed(2)}°, θ2={toDegrees(theta2).toFixed(2)}°
              </div>
            ) : (
              <div className={`${styles.infoBox} ${styles.errorBox}`}>
                Target non raggiungibile!
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>Lunghezze Segmenti</CardHeader>
            <form onSubmit={handleLengthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input 
                id="length-1" 
                label="Lunghezza L1" 
                type="number" 
                value={length1} 
                onChange={(e) => setLength1(e.target.value)} 
                step="1"
                min="1"
              />
              <Input 
                id="length-2" 
                label="Lunghezza L2" 
                type="number" 
                value={length2} 
                onChange={(e) => setLength2(e.target.value)} 
                step="1"
                min="1"
              />
              <Button type="submit" variant="ghost">Aggiorna Lunghezze</Button>
            </form>
          </Card>
        </div>
      </div>
    </Box>
  );
};

export default RoboticArmSimulator;