import React from "react";
import PropTypes from "prop-types";
import "./ToggleSwitch.css";

const ToggleSwitch = ({ id, checked, onChange, label }) => {
  return (
    <label htmlFor={id} className="toggle-switch-wrapper">
      <div className="toggle-switch">
        <input type="checkbox" id={id} checked={checked} onChange={onChange} />
        <span className="slider round"></span>
      </div>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
};

ToggleSwitch.propTypes = {
  id: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export default ToggleSwitch;