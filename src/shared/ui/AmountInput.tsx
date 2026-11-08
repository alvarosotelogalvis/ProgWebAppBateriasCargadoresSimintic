import React from 'react';
import styles from './AmountInput.module.css';

export interface AmountInputProps {
  value: number;
  onChange: (valor: number) => void;
  label?: string;
  disabled?: boolean;
  requerido?: boolean;
}

const formatCOP = (valor: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
};

const parseCOP = (texto: string): number => {
  const limpio = texto.replace(/[^\d]/g, '');
  return limpio ? parseInt(limpio, 10) : 0;
};

export default function AmountInput({
  value,
  onChange,
  label,
  disabled = false,
  requerido = false,
}: AmountInputProps) {
  const [inputValue, setInputValue] = React.useState(formatCOP(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    const parsed = parseCOP(inputValue);
    if (parsed >= 0) {
      onChange(parsed);
      setInputValue(formatCOP(parsed));
    } else {
      setInputValue(formatCOP(value));
    }
  };

  const handleFocus = () => {
    setInputValue(value.toString());
  };

  return (
    <div className={styles['amount-input']}>
      {label && (
        <label htmlFor={`amount-${label}`} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.container}>
        <span className={`${styles.currency} ${styles.primary}`}>COP</span>
        <input
          id={`amount-${label}`}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          aria-required={requerido}
          className={`${styles.input} ${styles['amount-xl']}`}
        />
      </div>
    </div>
  );
}
