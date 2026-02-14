interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  helper?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
  helper
}: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
      />
      {helper ? <small className="field-helper">{helper}</small> : null}
    </label>
  );
}
