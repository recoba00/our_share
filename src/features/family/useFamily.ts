import { useContext } from "react";
import { FamilyContext } from "./FamilyContext";

export function useFamily() {
  const context = useContext(FamilyContext);

  if (!context) {
    throw new Error("useFamily는 FamilyProvider 안에서 사용해야 합니다.");
  }

  return context;
}
