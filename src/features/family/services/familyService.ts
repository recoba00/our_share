import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import type { FamilyRole } from "../types/familyTypes";

type CreateFamilyInput = {
  name: string;
  owner: User;
};

type JoinFamilyInput = {
  inviteCode: string;
  user: User;
};

export async function createFamily({ name, owner }: CreateFamilyInput) {
  const familyRef = doc(collection(db, "families"));
  const inviteCode = createInviteCode();

  await setDoc(familyRef, {
    id: familyRef.id,
    name,
    ownerId: owner.uid,
    inviteCode,
    createdAt: serverTimestamp(),
  });

  await upsertFamilyMember({
    familyId: familyRef.id,
    user: owner,
    role: "OWNER",
    relation: "owner",
  });

  return {
    id: familyRef.id,
    inviteCode,
  };
}

export async function joinFamilyByInviteCode({
  inviteCode,
  user,
}: JoinFamilyInput) {
  const familiesQuery = query(
    collection(db, "families"),
    where("inviteCode", "==", inviteCode.trim().toUpperCase()),
    limit(1)
  );
  const snapshot = await getDocs(familiesQuery);
  const familyDoc = snapshot.docs[0];

  if (!familyDoc) {
    throw new Error("초대 코드를 찾을 수 없습니다.");
  }

  await upsertFamilyMember({
    familyId: familyDoc.id,
    user,
    role: "MEMBER",
    relation: "member",
  });

  return {
    id: familyDoc.id,
    name: familyDoc.data().name as string,
  };
}

async function upsertFamilyMember({
  familyId,
  relation,
  role,
  user,
}: {
  familyId: string;
  relation: string;
  role: FamilyRole;
  user: User;
}) {
  await setDoc(
    doc(db, "familyMembers", `${familyId}_${user.uid}`),
    {
      familyId,
      userId: user.uid,
      role,
      nickname: user.displayName ?? "가족",
      relation,
      permissions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
