declare module 'papaparse' {
  type ParseConfig<T> = {
    header?: boolean;
    skipEmptyLines?: boolean;
    complete?: (result: { data: T[] }) => void;
    error?: () => void;
  };

  const Papa: {
    parse<T = Record<string, string>>(file: File, config: ParseConfig<T>): void;
  };

  export default Papa;
}
