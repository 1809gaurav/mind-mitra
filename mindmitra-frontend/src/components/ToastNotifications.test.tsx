import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';

describe('Toast Notifications Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers toast.success and toast.error functions', () => {
    const successSpy = vi.spyOn(toast, 'success');
    const errorSpy = vi.spyOn(toast, 'error');

    toast.success('Signed in successfully!');
    toast.error('Login failed');

    expect(successSpy).toHaveBeenCalledWith('Signed in successfully!');
    expect(errorSpy).toHaveBeenCalledWith('Login failed');
  });

  it('supports custom toast options and dismiss', () => {
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    const toastId = toast.success('Saved entry', { id: 'test-toast-1' });
    toast.dismiss(toastId);

    expect(toastId).toBe('test-toast-1');
    expect(dismissSpy).toHaveBeenCalledWith('test-toast-1');
  });
});
