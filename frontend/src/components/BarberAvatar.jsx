import React, { useState } from 'react';

/**
 * Muestra la foto de perfil del barbero o, si no existe / falla, sus iniciales.
 *
 * Props:
 *   name       string   – Nombre del barbero (para la inicial de fallback)
 *   photoUrl   string   – URL de Cloudinary (puede ser vacío/null/undefined)
 *   className  string   – Clases Tailwind de tamaño y forma (ej. "w-12 h-12 rounded-xl")
 *   color      string   – Color hex para el gradiente de fondo de las iniciales
 *   style      object   – Estilos inline adicionales (ej. boxShadow)
 *   textSize   string   – Clase Tailwind para el tamaño del texto de la inicial
 */
const BarberAvatar = ({
  name,
  photoUrl,
  className = '',
  color,
  style = {},
  textSize = 'text-lg',
}) => {
  const [imgError, setImgError] = useState(false);
  const initial = (name || '?')[0].toUpperCase();

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${className} object-cover`}
        style={style}
        onError={() => setImgError(true)}
      />
    );
  }

  const bgStyle = color
    ? { background: `linear-gradient(135deg, ${color}cc, ${color}44)`, ...style }
    : style;

  return (
    <div
      className={`${className} flex items-center justify-center font-black text-white ${textSize}`}
      style={bgStyle}
    >
      {initial}
    </div>
  );
};

export default BarberAvatar;
