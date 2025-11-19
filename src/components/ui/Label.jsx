import React from "react";
import PropTypes from "prop-types";

const Label = ({ htmlFor, children, className = "" }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-300 mb-1 ${className}`}
    >
      {children}
    </label>
  );
};

Label.propTypes = {
  htmlFor: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Label;
