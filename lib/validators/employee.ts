import { z } from "zod";

export const EmployeeSchema = z.object({
  employeeNo: z.string().min(1, "사번은 필수입니다"),
  name: z.string().min(1, "이름은 필수입니다"),
  hireDate: z.coerce.date(),
  resignDate: z.coerce.date().optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  baseSalary: z.number().int().nonnegative("기본급은 0 이상"),
  dependents: z.number().int().min(1).max(11),
  status: z.enum(["active", "leave", "resigned"]).default("active"),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;
