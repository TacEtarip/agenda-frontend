import { FormControl, FormGroup } from '@angular/forms';
import { passwordsMatchValidator } from './login';

describe('passwordsMatchValidator', () => {
  const createForm = (password: string, confirmPassword: string) =>
    new FormGroup(
      {
        password: new FormControl(password),
        confirmPassword: new FormControl(confirmPassword),
      },
      { validators: passwordsMatchValidator },
    );

  it('accepts matching passwords', () => {
    expect(createForm('password123', 'password123').valid).toBe(true);
  });

  it('rejects different passwords', () => {
    expect(createForm('password123', 'different123').hasError('passwordMismatch')).toBe(true);
  });
});
