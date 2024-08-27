import { z } from "zod";

const lambdaSchema = z.object({
  entry: z.string(),
});

export const configSchema = z.object({
  strategy: z
    .enum(["traditional", "duet", "duet-time-sliced", "rmit"])
    .optional()
    .default("duet"),
  type: z.enum(["application", "micro"]).optional().default("application"),
  architecture: z.enum(["x86", "arm"]).optional().default("arm"),
  platform: z.enum(["aws", "azure", "gcp"]).optional().default("aws"),
  lambda_a: lambdaSchema,
  lambda_b: lambdaSchema,
});

export type Config = z.TypeOf<typeof configSchema>;
