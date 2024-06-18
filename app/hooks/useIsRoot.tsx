import { useLocation } from "@remix-run/react";

export default function useIsRoot() {
  const pathname = useLocation().pathname;

  return pathname === "/";
}
