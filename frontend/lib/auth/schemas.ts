import { z } from "zod";

const emailField = z.string().trim().min(1, "Enter your email").email("Enter a valid email");

/** Password rules: min 8, max 72, at least one letter and one digit. */
export const authPasswordValueSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v), "Include at least one letter")
  .refine((v) => /[0-9]/.test(v), "Include at least one number");

export const signInPasswordFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

export const signUpPasswordFormSchema = z
  .object({
    email: emailField,
    password: authPasswordValueSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordFormSchema = z.object({
  email: emailField,
});

export const updatePasswordFormSchema = z
  .object({
    password: authPasswordValueSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInPasswordForm = z.infer<typeof signInPasswordFormSchema>;
export type SignUpPasswordForm = z.infer<typeof signUpPasswordFormSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordFormSchema>;
export type UpdatePasswordForm = z.infer<typeof updatePasswordFormSchema>;
