import { describe, it, expect } from 'vitest';
import { sanitizar } from '@/infrastructure/logging/logger';

describe('logger.sanitizar', () => {
  it('remueve claves sensibles', () => {
    const dirtyData = {
      user: 'john',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      password: 'secret123',
      apiSecret: 'sk-1234567890',
      email: 'john@example.com',
    };

    const clean = sanitizar(dirtyData);
    expect(clean.token).toBeUndefined();
    expect(clean.password).toBeUndefined();
    expect(clean.apiSecret).toBeUndefined();
    expect(clean.email).toBe('john@example.com');
  });

  it('remueve query params sensibles de URLs', () => {
    const dirtyData = {
      url: 'https://graph.microsoft.com/v1.0/me?token=abc123&select=mail',
    };

    const clean = sanitizar(dirtyData);
    expect(clean.url).not.toContain('token=');
  });

  it('preserva datos públicos', () => {
    const data = {
      codigo: 'SVC-001',
      estado: 'FACTURADO',
      fecha: '2026-11-08',
    };

    const clean = sanitizar(data);
    expect(clean).toEqual(data);
  });
});
