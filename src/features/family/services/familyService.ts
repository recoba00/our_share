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

  await setDoc(doc(db, "familyInvites", inviteCode), {
    familyId: familyRef.id,
    inviteCode,
    name,
    ownerId: owner.uid,
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
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  const inviteSnapshot = await getDoc(doc(db, "familyInvites", normalizedInviteCode));

  if (!inviteSnapshot.exists()) {
    throw new Error("초대 코드를 찾을 수 없습니다.");
  }

  const invite = inviteSnapshot.data();
  const familyId = invite.familyId as string;

  await upsertFamilyMember({
    familyId,
    inviteCode: normalizedInviteCode,
    user,
    role: "MEMBER",
    relation: "member",
  });

  const familySnapshot = await getDoc(doc(db, "families", familyId));

  return {
    id: familyId,
    name: familySnapshot.exists()
      ? (familySnapshot.data().name as string)
      : (invite.name as string),
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
  const role = memberDoc.data().role as FamilyRole;
  const familySnapshot = await getDoc(doc(db, "families", familyId));

  if (!familySnapshot.exists()) {
    return null;
  }

  mirrorFamilyMemberRole({
    familyId,
    role,
    userId,
  }).catch(() => {
    // RTDB mirror backfill is best-effort during MVP.
  });

  const family = familySnapshot.data();
  const inviteCode = family.inviteCode as string;

  if (family.ownerId === userId && inviteCode) {
    ensureFamilyInviteIndex({
      familyId,
      inviteCode,
      name: family.name as string,
      ownerId: userId,
    }).catch(() => {
      // Invite index backfill is best-effort for older family documents.
    });
  }

  return {
    id: familySnapshot.id,
    name: family.name as string,
    inviteCode,
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
  inviteCode,
  relation,
  role,
  user,
}: {
  familyId: string;
  inviteCode?: string;
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
      ...(inviteCode ? { inviteCode } : {}),
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

async function mirrorFamilyMemberRole({
  familyId,
  role,
  userId,
}: {
  familyId: string;
  role: FamilyRole;
  userId: string;
}) {
  await set(ref(realtimeDb, `familyMembers/${familyId}/${userId}`), {
    role,
    userId,
    updatedAt: Date.now(),
  });
}

async function ensureFamilyInviteIndex({
  familyId,
  inviteCode,
  name,
  ownerId,
}: {
  familyId: string;
  inviteCode: string;
  name: string;
  ownerId: string;
}) {
  const inviteRef = doc(db, "familyInvites", inviteCode);
  const inviteSnapshot = await getDoc(inviteRef);

  if (inviteSnapshot.exists()) {
    return;
  }

  await setDoc(inviteRef, {
    familyId,
    inviteCode,
    name,
    ownerId,
    createdAt: serverTimestamp(),
  });
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
