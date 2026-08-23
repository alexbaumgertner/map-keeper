/** Minimal process.env typing so this package typechecks without @types/node installed. */
declare const process: {
  env: Record<string, string | undefined>;
};
