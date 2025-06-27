import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Calculation = {
    id: string;
    expression: string;
    result: number;
    timestamp: string;
    user_id: string | null;
    created_at: Generated<string>;
};
export type DB = {
    Calculation: Calculation;
};
