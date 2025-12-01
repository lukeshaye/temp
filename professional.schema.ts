import { z } from 'zod';

// Regex para validar formato HH:MM
export const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Schema para criação de um novo profissional.
 * Não inclui campos gerenciados pelo banco (id, created_at, updated_at).
 */
export const CreateProfessionalSchema = z.object({
  name: z.string().min(1, 'Nome do profissional é obrigatório'),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().nullable().or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, {
      message: 'Cor deve estar no formato hexadecimal #RRGGBB',
    }),
  
  // Aplicação de Coerção para robustez com formulários HTML
  salary: z.coerce
    .number()
    .positive({ message: 'Salário deve ser um valor positivo' }),
  
  commission_rate: z.coerce
    .number()
    .min(0, 'Comissão não pode ser negativa')
    .max(100, 'Comissão não pode exceder 100'),

  // Campos de horário de trabalho
  work_start_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
  work_end_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
  lunch_start_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
  lunch_end_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
});

/**
 * Schema completo do profissional, incluindo campos do banco.
 * Reflete o registro como existe no banco de dados.
 */
export const ProfessionalSchema = CreateProfessionalSchema.extend({
  id: z.number().int().positive(),
  created_at: z
    .string()
    .datetime({ message: 'Data de criação inválida' })
    .or(z.date()),
  updated_at: z
    .string()
    .datetime({ message: 'Data de atualização inválida' })
    .or(z.date()),
});

// Tipos inferidos para uso na aplicação
export type CreateProfessionalInput = z.infer<typeof CreateProfessionalSchema>;
export type Professional = z.infer<typeof ProfessionalSchema>;