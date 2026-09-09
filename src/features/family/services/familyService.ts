import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ref, set } from "firebase/database";
import { db, realtimeDb } from "../../../lib/firebase/app";
import type { FamilyMemberProfile, FamilyRole } from "../types/familyTypes";

type CreateFamilyInput = {
  name: string;
  owner: User;
};

type JoinFamilyInput = {
  inviteCode: string;
  user: User;
};

type UpdateFamilyMemberRoleInput = {
  actorUserId: string;
  familyId: string;
  role: Exclude<FamilyRole, "OWNER">;
  targetUserId: string;
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

export async function getFirstFamilyForUser(userId: string) {
  const membersQuery = query(
    collection(db, "familyMembers"),
    where("userId", "==", userId),
    limit(1)
  );
  const memberSnapshot = await getDocs(membersQuery);
  const memberDoc = memberSnapshot.docs[0];

  if (!memberDoc) {
    return null;
  }

  const familyId = memberDoc.data().familyId as string;
  const familySnapshot = await getDoc(doc(db, "families", familyId));

  if (!familySnapshot.exists()) {
    return null;
  }

  return {
    id: familySnapshot.id,
    name: familySnapshot.data().name as string,
    inviteCode: familySnapshot.data().inviteCode as string,
  };
}

export async function getFamilyMembers(
  familyId: string
): Promise<FamilyMemberProfile[]> {
  const membersQuery = query(
    collection(db, "familyMembers"),
    where("familyId", "==", familyId)
  );
  const memberSnapshot = await getDocs(membersQuery);

  return Promise.all(
    memberSnapshot.docs.map(async (memberDoc) => {
      const member = memberDoc.data();
      const userId = member.userId as string;
      const userSnapshot = await getDoc(doc(db, "users", userId));
      const profile = userSnapshot.exists() ? userSnapshot.data() : {};

      return {
        familyId: member.familyId as string,
        userId,
        role: member.role as FamilyRole,
        nickname: member.nickname as string,
        relation: member.relation as string,
        permissions: (member.permissions ?? []) as string[],
        createdAt: member.createdAt,
        displayName: (profile.displayName as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
        photoURL: (profile.photoURL as string | null) ?? null,
      };
    })
  );
}

export async function updateFamilyMemberRole({
  actorUserId,
  familyId,
  role,
  targetUserId,
}: UpdateFamilyMemberRoleInput) {
  const actorSnapshot = await getDoc(doc(db, "familyMembers", `${familyId}_${actorUserId}`));
  const targetRef = doc(db, "familyMembers", `${familyId}_${targetUserId}`);
  const targetSnapshot = await getDoc(targetRef);

  if (!actorSnapshot.exists() || actorSnapshot.data().role !== "OWNER") {
    throw new Error("가족 역할은 OWNER만 변경할 수 있습니다.");
  }

  if (!targetSnapshot.exists()) {
    throw new Error("변경할 가족 구성원을 찾을 수 없습니다.");
  }

  if (targetSnapshot.data().role === "OWNER") {
    throw new Error("OWNER 역할은 이 화면에서 변경할 수 없습니다.");
  }

  await updateDoc(targetRef, {
    role,
    updatedAt: serverTimestamp(),
  });

  await set(ref(realtimeDb, `familyMembers/${familyId}/${targetUserId}`), {
    role,
    userId: targetUserId,
    updatedAt: Date.now(),
  });
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

  await set(ref(realtimeDb, `familyMembers/${familyId}/${user.uid}`), {
    role,
    userId: user.uid,
    updatedAt: Date.now(),
  });
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
