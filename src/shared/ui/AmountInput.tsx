import { useEffect, useId, useRef, useState } from 'react';
import styles from './AmountInput.module.css';

export interface AmountInputProps {
  value: number;
  onChange: (valor: number) => void;
  label?: string;
  disabled?: boolean;
  requerido?: boolean;
}

const formatCOP = (valor: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);

const parseCOP = (texto: string): number => {
  const limpio = texto.replace(/\D/g, '');
  return limpio ? parseInt(limpio, 10) : 0;
};

/** Monto en pesos colombianos (entero, sin negativos). Notifica en cada cambio y formatea al salir. */
export default function AmountInput({
  value,
  onChange,
  label,
  disabled = false,
  requerido = false,
}: AmountInputProps) {
  const id = useId();
  const enfocado = useRef(false);
  const [texto, setTexto] = useState(formatCOP(value));

  // Si el valor cambia desde fuera (p. ej. al cargar el servicio) y no se está editando, se refleja.
  useEffect(() => {
    if (!enfocado.current) setTexto(formatCOP(value));
  }, [value]);

  const alCambiar = (evento: React.ChangeEvent<HTMLInputElement>): void => {
    const nuevo = evento.target.value;
    if (nuevo.includes('-')) return; // los negativos se rechazan, el campo conserva lo anterior
    setTexto(nuevo);
    onChange(parseCOP(nuevo));
  };

  return (
    <div className={styles['amount-input']}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      ) : null}
      <div className={styles.container}>
        <span className={`${styles.currency} ${styles.primary}`}>COP</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={texto}
          onChange={alCambiar}
          onFocus={() => {
            enfocado.current = true;
            setTexto(String(parseCOP(texto)));
          }}
          onBlur={() => {
            enfocado.current = false;
            setTexto(formatCOP(parseCOP(texto)));
          }}
          disabled={disabled}
          aria-required={requerido}
          className={`${styles.input} ${styles['amount-xl']}`}
        />
      </div>
    </div>
  );
}
