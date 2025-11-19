import React, { createContext, useState, useCallback, useContext } from "react";
import PropTypes from "prop-types";
import { nanoid } from "nanoid";
import Toast from "../Toast";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-20 right-4 z-[9999]">
    {toasts.map((toast) => (
      <Toast
        key={toast.id}
        message={toast.message}
        variant={toast.variant}
        onClose={() => removeToast(toast.id)}
      />
    ))}
  </div>
);

ToastContainer.propTypes = {
  toasts: PropTypes.array.isRequired,
  removeToast: PropTypes.func.isRequired,
};

export const ToastProvider = ({ children, autoCloseDuration = 5000 }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message, variant = "info") => {
      const id = nanoid();
      setToasts((prevToasts) => [...prevToasts, { id, message, variant }]);

      setTimeout(() => {
        removeToast(id);
      }, autoCloseDuration);
    },
    [removeToast, autoCloseDuration]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  autoCloseDuration: PropTypes.number,
};
