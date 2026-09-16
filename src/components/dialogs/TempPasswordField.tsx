import React from 'react';
import { Copy, Wand2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { PasswordInput } from '../ui/password-input';
import { copyToClipboard, generatePassword } from '../../lib/password';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../api/_contract';

interface TempPasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Password input with "Generate" and "Copy" helpers for temporary credentials. */
const TempPasswordField: React.FC<TempPasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  disabled,
}) => (
  <div className="grid gap-2">
    <Label htmlFor={id}>{label}</Label>
    <PasswordInput
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
      minLength={PASSWORD_MIN_LENGTH}
      maxLength={PASSWORD_MAX_LENGTH}
      autoComplete="new-password"
      disabled={disabled}
      required
    />
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(generatePassword())}
        disabled={disabled}
      >
        <Wand2 className="h-4 w-4" />
        Generate
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => copyToClipboard(value, 'Password copied')}
        disabled={disabled || !value}
      >
        <Copy className="h-4 w-4" />
        Copy
      </Button>
    </div>
  </div>
);

export default TempPasswordField;
