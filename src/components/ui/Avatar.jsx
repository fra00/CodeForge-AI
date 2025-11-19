import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Avatar.css';

/**
 * Componente per mostrare l'avatar di un utente.
 * Mostra un'immagine se l'URL è valido, altrimenti mostra un fallback
 * (le iniziali passate come children).
 *
 * @example
 * // Avatar con immagine e diverse dimensioni
 * <Avatar src="https://i.pravatar.cc/48" alt="Mario Rossi" size="medium">MR</Avatar>
 * <Avatar src="https://i.pravatar.cc/64" alt="Giulia Bianchi" size="large">GB</Avatar>
 *
 * @example
 * // Avatar senza immagine (mostra le iniziali di fallback)
 * <Avatar alt="Luigi Verdi" size="medium">LV</Avatar>
 *
 * @example
 * // Avatar con un URL immagine non valido (mostra le iniziali di fallback)
 * <Avatar
 *   src="https://invalid-url.com/image.jpg"
 *   alt="Anna Neri"
 *   size="medium"
 * >
 *   AN
 * </Avatar>
 */
const Avatar = ({
  src,
  alt,
  size = "medium",
  children,
  className = "",
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  // Resetta lo stato di errore se l'URL dell'immagine cambia
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
  };

  const showFallback = !src || hasError;

  const classNames = [
    "avatar",
    `avatar-${size}`,
    showFallback ? "avatar-fallback" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...rest}>
      {showFallback ? (
        <span className="avatar-initials">{children}</span>
      ) : (
        <img
          src={src}
          alt={alt}
          className="avatar-image"
          onError={handleError}
        />
      )}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  children: PropTypes.node, // Per le iniziali di fallback
  className: PropTypes.string,
};

Avatar.displayName = 'Avatar';

export default Avatar;
