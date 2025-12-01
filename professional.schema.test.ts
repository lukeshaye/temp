import { describe, it, expect } from 'vitest';
import {
  ProfessionalSchema,
  CreateProfessionalSchema,
} from './professional.schema';

describe('CreateProfessionalSchema', () => {
  const validCreateData = {
    name: 'Dr. Roberta',
    email: 'roberta@example.com',
    phone: '11987654321',
    color: '#FF00FF',
    salary: 5000.5,
    commission_rate: 10.5,
    work_start_time: '09:00',
    work_end_time: '18:00',
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
  };

  it('deve validar dados de criação de profissional com sucesso', () => {
    const result = CreateProfessionalSchema.safeParse(validCreateData);
    expect(result.success, result.error?.message).toBe(true);
  });

  it('deve permitir campos de tempo nulos', () => {
    const dataWithNullTimes = {
      ...validCreateData,
      work_start_time: null,
      lunch_start_time: null,
    };
    const result = CreateProfessionalSchema.safeParse(dataWithNullTimes);
    expect(result.success).toBe(true);
  });

  it('deve falhar se o nome estiver vazio', () => {
    const invalidData = { ...validCreateData, name: '' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Nome do profissional é obrigatório',
    );
  });

  it('deve falhar se a cor for inválida (sem #)', () => {
    const invalidData = { ...validCreateData, color: 'FF00FF' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });

  it('deve falhar se a cor for inválida (comprimento)', () => {
    const invalidData = { ...validCreateData, color: '#FF0' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });

  it('deve falhar se o salário for negativo', () => {
    const invalidData = { ...validCreateData, salary: -100 };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Salário deve ser um valor positivo',
    );
  });

  it('deve falhar se a comissão for negativa', () => {
    const invalidData = { ...validCreateData, commission_rate: -1 };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Comissão não pode ser negativa');
  });

  it('deve falhar se a comissão for maior que 100', () => {
    const invalidData = { ...validCreateData, commission_rate: 101 };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Comissão não pode exceder 100');
  });

  it('deve falhar se work_start_time tiver formato HH:MM inválido (hora)', () => {
    const invalidData = { ...validCreateData, work_start_time: '24:00' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Formato HH:MM inválido');
  });

  it('deve falhar se lunch_start_time tiver formato HH:MM inválido (minuto)', () => {
    const invalidData = { ...validCreateData, lunch_start_time: '12:60' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Formato HH:MM inválido');
  });

  it('deve falhar se work_end_time tiver formato HH:MM inválido (formato)', () => {
    const invalidData = { ...validCreateData, work_end_time: '9:00' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Formato HH:MM inválido');
  });
});

describe('ProfessionalSchema', () => {
  const validProfessionalData = {
    id: 1,
    name: 'Carlos Lima',
    email: 'carlos.lima@example.com',
    phone: null,
    color: '#00FF00',
    salary: 4500,
    commission_rate: 15,
    work_start_time: '08:30',
    work_end_time: '17:30',
    lunch_start_time: '11:30',
    lunch_end_time: '12:30',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('deve validar um profissional completo com sucesso', () => {
    const result = ProfessionalSchema.safeParse(validProfessionalData);
    expect(result.success, result.error?.message).toBe(true);
  });

  it('deve falhar se o ID for inválido (não positivo)', () => {
    const invalidData = { ...validProfessionalData, id: 0 };
    const result = ProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Number must be greater than 0',
    );
  });

  it('deve falhar se created_at for inválido', () => {
    const invalidData = { ...validProfessionalData, created_at: 'ontem' };
    const result = ProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Data de criação inválida');
  });
});