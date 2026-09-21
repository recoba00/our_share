import type { FormEvent } from "react";
import { UsersThree } from "@phosphor-icons/react";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Input } from "./Input";
import { useToast } from "./toastContext";
import { useAuth } from "../../features/auth/useAuth";
import { createFamily } from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";
import {
  limitFamilyNameInput,
  MAX_FAMILY_NAME_LENGTH,
} from "../../features/family/utils/familyName";
import { useState } from "react";

export function CreateFamilySheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { refreshFamilies } = useFamily();
  const { showToast } = useToast();
  const [newFamilyName, setNewFamilyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  function handleClose() {
    setNewFamilyName("");
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const normalizedName = newFamilyName.trim();

    if (!normalizedName) {
      showToast({ message: "크루 이름을 적어주세요.", variant: "info" });
      return;
    }

    setIsCreating(true);

    try {
      const result = await createFamily({ name: normalizedName, owner: user });
      await refreshFamilies(result.id);
      setNewFamilyName("");
      onClose();
      showToast({ message: "크루를 만들었어요.", variant: "success" });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "크루를 만들지 못했어요.",
        variant: "error",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="크루 생성">
      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <p className="text-sm font-semibold text-brand">새 크루 만들기</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
            크루를 만든 뒤 바로 해당 크루로 전환해요.
          </p>
        </div>
        <Input
          autoFocus
          label="크루 이름"
          maxLength={MAX_FAMILY_NAME_LENGTH}
          onChange={(event) => setNewFamilyName(limitFamilyNameInput(event.target.value))}
          placeholder="새 크루 이름을 적어주세요"
          value={newFamilyName}
        />
        <Button disabled={isCreating} loading={isCreating} type="submit">
          <UsersThree size={18} weight="bold" />
          생성하기
        </Button>
      </form>
    </BottomSheet>
  );
}
