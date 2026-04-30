import React from 'react';
import './ui.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...rest }) => {
  return (
    <button className={`ui-btn ui-btn-${variant} ${className}`} {...rest}>
      <span className="btn-content">{children}</span>
      <span className="ripple" aria-hidden />
    </button>
  );
};

export default Button;
