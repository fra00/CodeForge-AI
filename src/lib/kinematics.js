/**
 * Calcola la Cinematica Diretta (Forward Kinematics) per un braccio robotico planare 2DOF (2 segmenti).
 *
 * @param {number} L1 - Lunghezza del primo segmento (spalla-gomito).
 * @param {number} L2 - Lunghezza del secondo segmento (gomito-end-effector).
 * @param {number} theta1 - Angolo della spalla (in radianti, rispetto all'asse X).
 * @param {number} theta2 - Angolo del gomito (in radianti, relativo a L1).
 * @returns {{x: number, y: number, joint1: {x: number, y: number}, endEffector: {x: number, y: number}}} - Posizioni dei giunti e dell'end-effector.
 */
export function calculatePlanarFK(L1, L2, theta1, theta2) {
  // Posizione del Giunto 1 (Gomito)
  const x1 = L1 * Math.cos(theta1);
  const y1 = L1 * Math.sin(theta1);

  // Posizione dell'End-Effector (Polso)
  // L'angolo assoluto del secondo segmento è theta1 + theta2
  const x2 = x1 + L2 * Math.cos(theta1 + theta2);
  const y2 = y1 + L2 * Math.sin(theta1 + theta2);

  return {
    joint1: { x: x1, y: y1 },
    endEffector: { x: x2, y: y2 },
    x: x2,
    y: y2,
  };
}

/**
 * Calcola la Cinematica Inversa (Inverse Kinematics) per un braccio robotico planare 2DOF (2 segmenti).
 * Utilizza una soluzione analitica per trovare gli angoli dei giunti (spalla e gomito) per raggiungere un punto (x, y).
 *
 * @param {number} x - Coordinata X del punto target (end-effector).
 * @param {number} y - Coordinata Y del punto target (end-effector).
 * @param {number} L1 - Lunghezza del primo segmento (spalla-gomito).
 * @param {number} L2 - Lunghezza del secondo segmento (gomito-end-effector).
 * @param {boolean} [solveElbowDown=false] - Se true, calcola la soluzione "gomito in basso". Default è "gomito in alto".
 * @returns {{theta1: number, theta2: number, isReachable: boolean}} - Angoli dei giunti in radianti e stato di raggiungibilità.
 */
export function calculatePlanarIK(x, y, L1, L2, solveElbowDown = false) {
  const rSquared = x * x + y * y;
  const r = Math.sqrt(rSquared);

  // 1. Controlla la raggiungibilità
  // La distanza dal target non può essere maggiore della somma delle lunghezze dei segmenti
  // o minore della loro differenza assoluta. Una piccola tolleranza (epsilon) viene usata per i confronti.
  const epsilon = 1e-6;
  if (r > L1 + L2 + epsilon || r < Math.abs(L1 - L2) - epsilon) {
    return { theta1: 0, theta2: 0, isReachable: false };
  }

  // 2. Calcola l'angolo del gomito (theta2)
  // Dalla legge dei coseni, deriviamo cos(theta2)
  // cos(theta2) = (x^2 + y^2 - L1^2 - L2^2) / (2 * L1 * L2)
  const cosTheta2 = (rSquared - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  
  // Clamp del valore per evitare errori di dominio da imprecisioni floating-point
  const clampedCosTheta2 = Math.max(-1, Math.min(1, cosTheta2));
  let theta2 = Math.acos(clampedCosTheta2);

  // Per la soluzione "gomito in basso", l'angolo del gomito è semplicemente negato
  if (solveElbowDown) {
    theta2 = -theta2;
  }

  // 3. Calcola l'angolo della spalla (theta1)
  // theta1 può essere derivato usando la scomposizione vettoriale o la legge dei coseni.
  // Si usa una forma trigonometrica stabile:
  // theta1 = atan2(y, x) - atan2(L2 * sin(theta2), L1 + L2 * cos(theta2))
  const beta = Math.atan2(L2 * Math.sin(theta2), L1 + L2 * Math.cos(theta2));
  const alpha = Math.atan2(y, x);
  const theta1 = alpha - beta;

  return {
    theta1: theta1,
    theta2: theta2,
    isReachable: true,
  };
}

/**
 * Converte radianti in gradi.
 * @param {number} radians - Angolo in radianti.
 * @returns {number} - Angolo in gradi.
 */
export function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Converte gradi in radianti.
 * @param {number} degrees - Angolo in gradi.
 * @returns {number} - Angolo in radianti.
 */
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// La funzione calculateIK 2D non è più necessaria e viene rimossa.