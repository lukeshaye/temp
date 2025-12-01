import { describe, it, expect } from 'vitest'
import { LoginSchema } from './auth.schema'

describe('LoginSchema', () => {
  const validLogin = {
    email: 'test@example.com',
    password: 'password123',
  }

  it('should validate a correct login object', () => {
    const result = LoginSchema.safeParse(validLogin)
    expect(result.success).toBe(true)
  })

  it('should fail if email is invalid (e.g., missing "@")', () => {
    const result = LoginSchema.safeParse({
      ...validLogin,
      email: 'invalid-email.com',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Email inválido.')
  })

  it('should fail if password is too short (5 characters)', () => {
    const result = LoginSchema.safeParse({
      ...validLogin,
      password: '12345',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe(
      'A senha deve ter pelo menos 6 caracteres.',
    )
  })

  it('should fail if email is empty', () => {
    const result = LoginSchema.safeParse({
      ...validLogin,
      email: '',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Email inválido.')
  })

  it('should fail if password is empty', () => {
    const result = LoginSchema.safeParse({
      ...validLogin,
      password: '',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe(
      'A senha deve ter pelo menos 6 caracteres.',
    )
  })
})