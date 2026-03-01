/**
 * Type shim for react-hook-form when package dist references missing ../src (published package has no src/).
 * Ensures useForm and common types resolve for consumers.
 */
declare module "react-hook-form" {
  export interface UseFormReturn<
    TFieldValues extends Record<string, unknown> = Record<string, unknown>,
  > {
    register: (name: any, options?: any) => any;
    handleSubmit: (onValid: (data: TFieldValues) => void) => (e?: any) => void;
    formState: {
      errors: Record<string, { message?: string }>;
      isSubmitting: boolean;
      isDirty?: boolean;
      dirtyFields?: Partial<Record<keyof TFieldValues, boolean>>;
      [key: string]: unknown;
    };
    watch: (name?: any) => any;
    setValue: (name: any, value: any, options?: any) => void;
    getValues: (name?: any) => any;
    reset: (values?: any) => void;
    control: unknown;
    [key: string]: unknown;
  }

  export interface UseFormProps<
    TFieldValues extends Record<string, unknown> = Record<string, unknown>,
  > {
    defaultValues?: Partial<TFieldValues>;
    values?: Partial<TFieldValues>;
    resolver?: (values: TFieldValues, context: unknown, options: unknown) => Promise<{ values: TFieldValues; errors: Record<string, { message?: string }> }>;
    [key: string]: unknown;
  }

  export function useForm<
    TFieldValues extends Record<string, unknown> = Record<string, unknown>,
  >(
    props?: UseFormProps<TFieldValues>
  ): UseFormReturn<TFieldValues>;

  export interface FieldArrayWithId<T = unknown> {
    id: string;
    [key: string]: unknown;
  }

  export interface UseFieldArrayReturn<
    TFieldValues extends Record<string, unknown> = Record<string, unknown>,
  > {
    fields: FieldArrayWithId<TFieldValues>[];
    append: (value: Partial<TFieldValues> | Partial<TFieldValues>[], options?: { shouldFocus?: boolean }) => void;
    remove: (index: number | number[]) => void;
    move: (from: number, to: number) => void;
    insert: (index: number, value: Partial<TFieldValues> | Partial<TFieldValues>[], options?: { shouldFocus?: boolean }) => void;
    prepend: (value: Partial<TFieldValues> | Partial<TFieldValues>[], options?: { shouldFocus?: boolean }) => void;
    swap: (a: number, b: number) => void;
    replace: (value: Partial<TFieldValues>[]) => void;
  }

  export function useFieldArray<
    TFieldValues extends Record<string, unknown> = Record<string, unknown>,
  >(
    props: { control: UseFormReturn<TFieldValues>["control"]; name: string }
  ): UseFieldArrayReturn<TFieldValues>;
}
