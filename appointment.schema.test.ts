import { describe, it, expect } from 'vitest';
import { AppointmentFormSchema, AppointmentSchema } from './appointment.schema';

describe('Appointment Schemas', () => {
  const baseDate = new Date();
  const validFormData = {
    client_id: 1,
    professional_id: 2,
    service_id: 3,
    appointment_date: baseDate,
    end_date: new Date(baseDate.getTime() + 30 * 60000), // 30 minutos depois
    price: 100.0,
    notes: 'Cliente pediu para não usar secador.',
  };

  const validDbData = {
    ...validFormData,
    id: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // --- Testes para AppointmentFormSchema ---
  describe('AppointmentFormSchema', () => {
    it('should validate correctly formatted form data', () => {
      const result = AppointmentFormSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    it('should fail if end_date is before appointment_date (.refine)', () => {
      const invalidData = {
        ...validFormData,
        end_date: new Date(baseDate.getTime() - 30 * 60000), // 30 minutos antes
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      // Verifica se o erro está no 'path' [end_date] conforme o .refine
      expect(
        result.error.issues.some((issue) => issue.path.includes('end_date')),
      ).toBe(true);
    });

    it('should fail if client_id is not a positive number', () => {
      const invalidData = { ...validFormData, client_id: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('client_id')),
      ).toBe(true);
    });

    it('should fail if professional_id is not a positive number', () => {
      const invalidData = { ...validFormData, professional_id: -1 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('professional_id'),
        ),
      ).toBe(true);
    });

    it('should fail if service_id is not a positive number', () => {
      const invalidData = { ...validFormData, service_id: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('service_id')),
      ).toBe(true);
    });

    it('should fail if any ID is not a number', () => {
      const invalidData = {
        ...validFormData,
        client_id: '1' as any, // Força o tipo errado
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('client_id')),
      ).toBe(true);
    });

    it('should fail if price is not positive', () => {
      const invalidData = { ...validFormData, price: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('price')),
      ).toBe(true);
    });

    it('should fail if appointment_date is not a valid date', () => {
      const invalidData = {
        ...validFormData,
        appointment_date: 'não é uma data' as any,
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('appointment_date'),
        ),
      ).toBe(true);
    });
  });

  // --- Testes para AppointmentSchema ---
  describe('AppointmentSchema', () => {
    it('should validate a full appointment object (e.g., from DB)', () => {
      const result = AppointmentSchema.safeParse(validDbData);
      expect(result.success).toBe(true);
    });

    it('should fail if id is missing', () => {
      const invalidData = { ...validDbData };
      delete (invalidData as any).id;
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('id')),
      ).toBe(true);
    });

    it('should still enforce the .refine() rule', () => {
      const invalidData = {
        ...validDbData,
        end_date: new Date(baseDate.getTime() - 1), // 1ms antes
      };
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('end_date')),
      ).toBe(true);
    });
  });
});