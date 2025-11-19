import React, { useState } from 'react';
import { Wizard, WizardPages, useWizard } from '../Wizard';
import Card from '../Card';
import CardHeader from '../CardHeader';
import Button from '../Button';
import Input from '../Input';
import ProgressBar from '../ProgressBar';
import CodeBlock from '../CodeBlock';

/**
 * Sotto-componente per i controlli di navigazione del Wizard.
 * Utilizza l'hook `useWizard` per accedere allo stato.
 */
const WizardControls = () => {
  const { prevStep, nextStep, isFirstStep, isLastStep } = useWizard();

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
      <Button onClick={prevStep} disabled={isFirstStep}>
        Indietro
      </Button>
      <Button onClick={nextStep} variant="primary">
        {isLastStep ? 'Fine' : 'Avanti'}
      </Button>
    </div>
  );
};

/**
 * Sotto-componente per la barra di progresso del Wizard.
 */
const WizardProgress = () => {
  const { activeStep, totalSteps } = useWizard();
  const progress = ((activeStep + 1) / totalSteps) * 100;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <p>Passaggio {activeStep + 1} di {totalSteps}</p>
      <ProgressBar progress={progress} />
    </div>
  );
};

/**
 * @private Esempio di primo step del wizard.
 */
const Step1 = ({ data, setData, errors }) => (
  <div>
    <h4>Informazioni Personali</h4>
    <Input
      id="name"
      label="Nome"
      placeholder="Mario"
      value={data.name}
      onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
      error={errors.name}
    />
    <Input
      id="surname"
      label="Cognome"
      placeholder="Rossi"
      value={data.surname}
      onChange={e => setData(prev => ({ ...prev, surname: e.target.value }))}
      error={errors.surname}
    />
  </div>
);

/**
 * @private Esempio di secondo step del wizard.
 */
const Step2 = ({ data, setData, errors }) => (
  <div>
    <h4>Dettagli Account</h4>
    <Input
      id="email"
      label="Email"
      placeholder="mario.rossi@example.com"
      value={data.email}
      onChange={e => setData(prev => ({ ...prev, email: e.target.value }))}
      error={errors.email}
    />
    <Input
      id="password"
      label="Password"
      type="password"
      value={data.password}
      onChange={e => setData(prev => ({ ...prev, password: e.target.value }))}
      error={errors.password}
    />
  </div>
);

/**
 * @private Esempio di terzo step (riepilogo) del wizard.
 */
const Step3 = ({ data }) => (
  <div>
    <h4>Riepilogo</h4>
    <p>Controlla i tuoi dati prima di terminare.</p>
    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
      <li><strong>Nome:</strong> {data.name}</li>
      <li><strong>Cognome:</strong> {data.surname}</li>
      <li><strong>Email:</strong> {data.email}</li>
    </ul>
  </div>
);

/**
 * Componente di esempio per mostrare l'utilizzo del componente Wizard.
 */
const ExampleWizard = () => {
  const totalSteps = 3;
  const [formData, setFormData] = useState({ name: '', surname: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const codeSnippet = `
import { Wizard, WizardPages, useWizard } from './Wizard';
import Button from './Button';

// Componente per i controlli di navigazione
const WizardControls = () => {
  const { prevStep, nextStep, isFirstStep, isLastStep } = useWizard();
  return (
    <div>
      <Button onClick={prevStep} disabled={isFirstStep}>Indietro</Button>
      <Button onClick={nextStep} variant="primary">
        {isLastStep ? 'Fine' : 'Avanti'}
      </Button>
    </div>
  );
};

const MyWizard = () => (
  <Wizard totalSteps={3} onFinish={() => alert('Completato!')}>
    <WizardPages>
      <div>Contenuto del Passaggio 1</div>
      <div>Contenuto del Passaggio 2</div>
      <div>Contenuto del Passaggio 3</div>
    </WizardPages>
    <WizardControls />
  </Wizard>
);`;

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Il nome è obbligatorio.';
    if (!formData.surname) newErrors.surname = 'Il cognome è obbligatorio.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email non valida.';
    if (!formData.password || formData.password.length < 6) newErrors.password = 'La password deve avere almeno 6 caratteri.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBeforeStepChange = currentStep => {
    if (currentStep === 0) return validateStep1();
    if (currentStep === 1) return validateStep2();
    return true; // Nessuna validazione per gli altri step
  };

  return (
    <Card>
      <CardHeader>Esempio di Wizard con Validazione</CardHeader>
      <Wizard totalSteps={totalSteps} onFinish={() => alert('Wizard completato!')} onBeforeStepChange={handleBeforeStepChange}>
        <WizardProgress />
        <WizardPages>
          <Step1 data={formData} setData={setFormData} errors={errors} />
          <Step2 data={formData} setData={setFormData} errors={errors} />
          <Step3 data={formData} />
        </WizardPages>
        <WizardControls />
      </Wizard>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleWizard;