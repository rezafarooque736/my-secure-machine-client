import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, 'Password must be at least 8 characters'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().max(100, 'Full name must be less than 100 characters').optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  organization: z.string().max(100, 'Organization must be less than 100 characters').optional(),
  organizationalRole: z.string().max(100, 'Role must be less than 100 characters').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
