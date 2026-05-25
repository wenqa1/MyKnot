import type { Request, Response, NextFunction } from "express";

export function assertString(val: unknown, name: string): asserts val is string {
  if (typeof val !== "string" || val.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}

export function assertOptionalString(
  val: unknown,
  _name: string
): val is string | undefined | null {
  if (val === undefined || val === null) return true;
  return typeof val === "string";
}

export function assertInt(
  val: unknown,
  name: string
): asserts val is number {
  if (typeof val !== "number" || !Number.isInteger(val)) {
    throw new Error(`${name} must be an integer`);
  }
}

export function assertOptionalInt(
  val: unknown,
  _name: string
): val is number | undefined | null {
  if (val === undefined || val === null) return true;
  return typeof val === "number" && Number.isInteger(val);
}

export function validate(schema: Record<string, (val: unknown) => void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req.method === "GET" ? req.query : req.body;
      for (const [field, validator] of Object.entries(schema)) {
        validator(data[field]);
      }
      next();
    } catch (err) {
      res
        .status(400)
        .json({ error: err instanceof Error ? err.message : "Validation failed" });
    }
  };
}
