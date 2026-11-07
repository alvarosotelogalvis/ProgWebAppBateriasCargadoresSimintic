import AmountInput from '@/shared/ui/AmountInput';

export interface CampoMonedaProps {
  label: string;
  valor?: number;
  onChange: (valor: number) => void;
  requerido?: boolean;
  disabled?: boolean;
  helpText?: string;
}

export default function CampoMoneda({
  label,
  valor = 0,
  onChange,
  requerido = false,
  disabled = false,
  helpText,
}: CampoMonedaProps) {
  return (
    <div className="campo-moneda">
      <AmountInput
        value={valor}
        onChange={onChange}
        label={label}
        requerido={requerido}
        disabled={disabled}
      />
      {helpText && <small>{helpText}</small>}
    </div>
  );
}
