import { z } from 'zod';

/**
 * CONSTANTES DE VALIDAÇÃO
 * Princípio 2.2 (DRY): Centralizamos o Regex de hora para garantir consistência
 * caso precise ser usado em outros schemas.
 */
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // Formato HH:MM (00:00 a 23:59)

/**
 * SCHEMA DE CRIAÇÃO DE AGENDAMENTO
 * Princípio 2.16 (DSpP): Validação de borda robusta (ids inteiros e positivos).
 * Princípio 2.12 (CQRS): Otimizado para operação de escrita (separando data e hora).
 */
export const CreateAppointmentSchema = z.object({
  client_id: z.number({ required_error: "Cliente é obrigatório" }).int().positive(),
  professional_id: z.number({ required_error: "Profissional é obrigatório" }).int().positive(),
  service_id: z.number({ required_error: "Serviço é obrigatório" }).int().positive(),
  
  // z.coerce.date() facilita o binding com inputs HTML que retornam string
  appointment_date: z.coerce.date({
    required_error: 'A data do agendamento é obrigatória.',
  }),

  // Validamos o formato da string de hora antes de processar a lógica
  start_time: z.string().regex(TIME_REGEX, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(TIME_REGEX, "Formato de hora inválido (HH:MM)"),

  price: z.number().positive('O preço deve ser um valor positivo.'),
  notes: z.string().optional(),
})
.refine((data) => {
  /**
   * LÓGICA DE VALIDAÇÃO TEMPORAL
   * Princípio 2.15 (PTE): Lógica determinística e isolada.
   */
  try {
    // OBSERVAÇÃO TÉCNICA DE ROBUSTEZ:
    // O uso de toISOString() converte para UTC e pode alterar o dia (ex: 21h BRT -> 00h UTC do dia seguinte).
    // No entanto, como usamos a MESMA base `dateStr` para construir tanto o `start` quanto o `end`,
    // o deslocamento afeta ambas as variáveis igualmente. A diferença relativa se mantém correta,
    // garantindo a segurança da validação "Fim > Início" independentemente do Timezone.
    const dateStr = data.appointment_date.toISOString().split('T')[0];
    
    const start = new Date(`${dateStr}T${data.start_time}`);
    const end = new Date(`${dateStr}T${data.end_time}`);

    return end > start;
  } catch (e) {
    return false; // Falha segura (DSpP) caso a data seja inválida
  }
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["end_time"], // Aponta o erro especificamente para o campo end_time
});

// Tipos inferidos para uso no Frontend e Backend
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;