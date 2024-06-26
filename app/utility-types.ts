declare global {
  // this is a known trick to get autocomplete for strings without enforcing their type to conform to that union
  // eslint-disable-next-line @typescript-eslint/ban-types
  type StringHint<T extends string> = T | (string & {});
}

export {};
