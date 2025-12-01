import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string()
    .min(1, { message: 'Senha obrigatória' })
    .min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;