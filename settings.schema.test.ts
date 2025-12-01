import { describe, it, expect } from 'vitest'
import {
  BusinessHoursSchema,
  BusinessExceptionSchema,
} from './settings.schema'

describe('BusinessHoursSchema', () => {
  const validBusinessHour = {
    id: 1,
    day_of_week: 1, // Segunda-feira
    start_time: '09:00',
    end_time: '18:00',
    company_id: 'uuid-company-1',
  }

  it('should validate a correct business hour entry', () => {
    const result = BusinessHoursSchema.safeParse(validBusinessHour)
    expect(result.success).toBe(true)
  })

  it('should accept null start_time and end_time', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      start_time: null,
      end_time: null,
    })
    expect(result.success).toBe(true)
  })

  it('should fail if day_of_week is less than 0', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      day_of_week: -1,
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('mínimo 0')
  })

  it('should fail if day_of_week is greater than 6', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      day_of_week: 7,
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('máximo 6')
  })

  it('should fail if start_time has invalid time format (regex)', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      start_time: '25:00',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })

  it('should fail if end_time has invalid time format (regex)', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      end_time: '18:60',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })
})

describe('BusinessExceptionSchema', () => {
  const validException = {
    id: 1,
    exception_date: '2025-12-25',
    description: 'Natal',
    start_time: '10:00',
    end_time: '14:00',
    company_id: 'uuid-company-1',
  }

  it('should validate a correct business exception entry', () => {
    const result = BusinessExceptionSchema.safeParse(validException)
    expect(result.success).toBe(true)
  })

  it('should fail if exception_date is not a valid date string', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      exception_date: '2025-13-01', // Mês inválido
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Data inválida')
  })

  it('should fail if description is empty', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      description: '',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Descrição é obrigatória')
  })

  it('should fail if start_time has invalid time format (regex)', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      start_time: 'abc',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })

  it('should fail if end_time has invalid time format (regex)', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      end_time: '09:99',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })
})