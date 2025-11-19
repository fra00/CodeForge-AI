import React from "react";
import PropTypes from "prop-types";

const Toast = ({ message, variant = "info", onClose }) => {
  const variantClasses = {
    success:
      "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200",
    danger: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200",
    warning:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
  };

  return (
    <div
      className={`flex items-center w-full max-w-xs p-4 mb-4 rounded-lg shadow-lg ${variantClasses[variant]}`}
      role="alert"
    >
      <div className="ml-3 text-sm font-medium">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8"
        onClick={onClose}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["success", "danger", "warning", "info"]),
  onClose: PropTypes.func.isRequired,
};

export default Toast;
