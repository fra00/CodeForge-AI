import { create } from 'zustand';
import { toRadians, calculatePlanarIK } from '../lib/kinematics';

const DEFAULT_L1 = 100;
const DEFAULT_L2 = 100;

export const useRoboticArmStore = create((set, get) => ({
  // Stato del braccio
  L1: DEFAULT_L1,
  L2: DEFAULT_L2,
  theta1: toRadians(45), // Angolo iniziale spalla (in radianti)
  theta2: toRadians(0), // Angolo iniziale gomito (in radianti)
  
  // Stato del target per IK
  targetX: 141.42, // Corrisponde a L1=100, L2=100, theta1=45, theta2=0
  targetY: 141.42,
  isReachable: true,

  // Azioni
  setAngles: (newTheta1, newTheta2) => set({ 
    theta1: newTheta1, 
    theta2: newTheta2,
    // Quando si impostano gli angoli, il target non è più rilevante per l'IK, 
    // ma lo stato del braccio è definito dagli angoli.
    isReachable: true, 
  }),

  setTarget: (x, y) => {
    const { L1, L2 } = get();
    const { theta1, theta2, isReachable } = calculatePlanarIK(x, y, L1, L2);

    set({
      targetX: x,
      targetY: y,
      theta1: isReachable ? theta1 : get().theta1, // Aggiorna solo se raggiungibile
      theta2: isReachable ? theta2 : get().theta2,
      isReachable: isReachable,
    });
  },

  setLengths: (newLength1, newLength2) => {
    const { targetX, targetY } = get();
    const { theta1, theta2, isReachable } = calculatePlanarIK(targetX, targetY, newLength1, newLength2);

    set({
      L1: newLength1,
      L2: newLength2,
      theta1: isReachable ? theta1 : get().theta1,
      theta2: isReachable ? theta2 : get().theta2,
      isReachable: isReachable,
    });
  },
}));