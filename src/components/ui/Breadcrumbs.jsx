import React from "react";
import PropTypes from "prop-types";
import "./Breadcrumbs.css";

/**
 * Un componente per mostrare il percorso di navigazione (breadcrumbs).
 */
const Breadcrumbs = ({
  items = [],
  separator = "/",
  className = "",
  ...rest
}) => {
  const classNames = ["breadcrumbs", className].filter(Boolean).join(" ");

  return (
    <nav aria-label="breadcrumb" className={classNames} {...rest}>
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            {item.href && index < items.length - 1 ? (
              <a href={item.href} className="breadcrumb-link">
                {item.label}
              </a>
            ) : (
              <span
                className="breadcrumb-current"
                aria-current={index === items.length - 1 ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {index < items.length - 1 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                {separator}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

Breadcrumbs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
    })
  ).isRequired,
  separator: PropTypes.node,
  className: PropTypes.string,
};

export default Breadcrumbs;
