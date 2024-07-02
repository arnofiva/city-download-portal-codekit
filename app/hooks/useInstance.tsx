import { useState } from "react";

export default function useInstance<T>(create: () => T) {
  const [instance] = useState(create);
  return instance;
}