import React, { useState, useMemo, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import './Wizard.css';

const WizardContext = createContext(null);

/**
 * Hook per accedere allo stato e ai metodi del wizard.
 */
export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error(
      "useWizard deve essere usato all'interno di un componente Wizard."
    );
  }
  return context;
};

/**
 * Il contenitore principale del Wizard. Fornisce la gestione dello stato
 * per un processo a più passaggi.
 */
export const Wizard = ({ children, onFinish, totalSteps, onBeforeStepChange }) => {
  const [activeStep, setActiveStep] = useState(0);

  const nextStep = async () => {
    if (onBeforeStepChange) {
      // Permette al genitore di eseguire una validazione asincrona.
      // Se ritorna `false`, il passo non viene cambiato.
      const canProceed = await onBeforeStepChange(activeStep);
      if (canProceed === false) {
        return;
      }
    }

    if (activeStep < totalSteps - 1) {
      setActiveStep((i) => i + 1);
    } else if (onFinish) {
      onFinish();
    }
  };

  const prevStep = () => {
    setActiveStep((i) => Math.max(i - 1, 0));
  };

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setActiveStep(stepIndex);
    }
  };

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;

  const value = useMemo(
    () => ({
      activeStep,
      totalSteps,
      nextStep,
      prevStep,
      goToStep,
      isFirstStep,
      isLastStep,
    }),
    [activeStep, totalSteps]
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
};

Wizard.propTypes = {
  children: PropTypes.node.isRequired,
  onFinish: PropTypes.func,
  totalSteps: PropTypes.number.isRequired,
  onBeforeStepChange: PropTypes.func,
};

/**
 * Un contenitore che renderizza solo il contenuto dello step attivo.
 */
export const WizardPages = ({ children }) => {
  const { activeStep } = useWizard();
  const pages = React.Children.toArray(children);
  return <div className="wizard-pages">{pages[activeStep]}</div>;
};

WizardPages.propTypes = {
  children: PropTypes.node.isRequired,
};
