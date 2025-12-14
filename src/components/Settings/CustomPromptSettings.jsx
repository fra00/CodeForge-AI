import React, { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/useSettingsStore";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Textarea from "../ui/Textarea";
import Label from "../ui/Label";

export const CustomPromptSettings = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const customSystemPrompt = useSettingsStore(
    (state) => state.customSystemPrompt
  );
  const setCustomSystemPrompt = useSettingsStore(
    (state) => state.setCustomSystemPrompt
  );
  const [currentPrompt, setCurrentPrompt] = useState(customSystemPrompt);

  useEffect(() => {
    setCurrentPrompt(customSystemPrompt);
  }, [customSystemPrompt]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Ripristina il valore del prompt a quello salvato se si annulla
    setCurrentPrompt(customSystemPrompt);
  };

  const handleSave = () => {
    setCustomSystemPrompt(currentPrompt);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Label>Custom System Prompt</Label>
      <p className="text-sm text-gray-500 mb-2">
        Aggiungi istruzioni personalizzate che verranno iniettate nel prompt di
        sistema.
      </p>
      <Button onClick={handleOpenModal} variant="outline">
        Modifica Prompt Custom
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Modifica Prompt di Sistema Custom"
      >
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-gray-500">
            Le istruzioni inserite qui verranno aggiunte al prompt di sistema
            base inviato all'IA. Se lasciato vuoto, non verrà aggiunta nessuna
            sezione custom.
          </p>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Es: Rispondi sempre in JSON..."
            rows={10}
            className="w-full"
          />
          <div className="flex justify-end space-x-2">
            <Button onClick={handleCloseModal} variant="ghost">
              Annulla
            </Button>
            <Button onClick={handleSave}>Salva</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
