import { z } from 'zod';

// ---------------------------------------------------------------------------
// Aplicação do Princípio 2.2 (DRY - Don't Repeat Yourself)
// ---------------------------------------------------------------------------
// A regex é definida uma única vez como uma constante autoritativa. 
// Isso evita a duplicação da lógica de validação de horário em múltiplos pontos do schema.
// Formato aceito: HH:MM (ex: 08:00, 23:59).
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const TIME_ERROR_MESSAGE = 'Formato de horário inválido. Use o formato HH:MM.';

// ---------------------------------------------------------------------------
// Schema: BusinessHours (Horários de Funcionamento)
// ---------------------------------------------------------------------------
export const BusinessHoursSchema = z.object({
  id: z.number().int().positive().optional(),
  
  day_of_week: z
    .number({ invalid_type_error: "O dia da semana deve ser um número." })
    .int("O dia da semana deve ser um número inteiro.")
    .min(0, "O dia deve ser no mínimo 0 (Domingo).")
    .max(6, "O dia deve ser no máximo 6 (Sábado)."),
    
  // Aplicação do Princípio 2.16 (DSpP - Design Seguro por Padrão)
  // Validação estrita na entrada ("zero trust"). Garante que o dado só entra
  // se estiver perfeitamente formatado, prevenindo erros de runtime.
  start_time: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable(),
    
  end_time: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable(),
});

// ---------------------------------------------------------------------------
// Schema: BusinessException (Exceções de Horário/Feriados)
// ---------------------------------------------------------------------------
export const BusinessExceptionSchema = z.object({
  id: z.number().int().positive().optional(),
  
  // Mantido z.string().date() para validação estrita do formato ISO (YYYY-MM-DD).
  // Evita o uso de coerce.date() que poderia aceitar strings ambíguas.
  exception_date: z
    .string({ required_error: "A data da exceção é obrigatória." })
    .date("A data deve estar no formato YYYY-MM-DD."), 
    
  description: z
    .string()
    .min(1, { message: 'A descrição da exceção é obrigatória.' }),
    
  // Reutilização da constante TIME_REGEX (Princípio 2.2)
  start_time: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable()
    .optional(),
    
  end_time: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable()
    .optional(),
});

// Exportação dos tipos inferidos para uso no frontend/backend
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;
export type BusinessException = z.infer<typeof BusinessExceptionSchema>;