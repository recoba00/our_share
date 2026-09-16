import type { User } from "firebase/auth";
import {
  collection,
  documentId,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref, remove, set } from "firebase/database";
import { db, realtimeDb } from "../../../lib/firebase/app";
import type { FamilyMemberProfile, FamilyRole } from "../types/familyTypes";
import { MAX_FAMILY_NAME_LENGTH } from "../utils/familyName";

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

type DeleteFamilyMemberInput = {
  actorUserId: string;
  familyId: string;
  targetUserId: string;
};

type UpdateFamilyInput = {
  familyId: string;
  name: string;
};

type DeleteFamilyInput = {
  familyId: string;
  ownerId: string;
};

type LeaveFamilyInput = {
  familyId: string;
  userId: string;
};

type JoinFamilyResult = {
  id: string;
  name: string;
  alreadyMember: boolean;
};

const inFlightInviteJoins = new Map<string, Promise<JoinFamilyResult>>();

export async function createFamily({ name, owner }: CreateFamilyInput) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("크루 이름을 입력해주세요.");
  }

  if (Array.from(normalizedName).length > MAX_FAMILY_NAME_LENGTH) {
    throw new Error(`크루 이름은 ${MAX_FAMILY_NAME_LENGTH}자 이내로 입력해주세요.`);
  }

  const familyRef = doc(collection(db, "families"));
  const inviteCode = createInviteCode();

  await setDoc(familyRef, {
    id: familyRef.id,
    name: normalizedName,
    ownerId: owner.uid,
    inviteCode,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "familyInvites", inviteCode), {
    familyId: familyRef.id,
    inviteCode,
    name: normalizedName,
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

export function joinFamilyByInviteCode({
  inviteCode,
  user,
}: JoinFamilyInput): Promise<JoinFamilyResult> {
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  const requestKey = `${normalizedInviteCode}:${user.uid}`;
  const existingRequest = inFlightInviteJoins.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = joinFamilyByInviteCodeInternal({
    inviteCode: normalizedInviteCode,
    user,
  });

  inFlightInviteJoins.set(requestKey, request);
  request.then(
    () => inFlightInviteJoins.delete(requestKey),
    () => inFlightInviteJoins.delete(requestKey)
  );

  return request;
}

async function joinFamilyByInviteCodeInternal({
  inviteCode,
  user,
}: JoinFamilyInput): Promise<JoinFamilyResult> {
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  const inviteSnapshot = await getDoc(doc(db, "familyInvites", normalizedInviteCode));

  if (!inviteSnapshot.exists()) {
    throw new Error("초대 코드를 찾을 수 없습니다.");
  }

  const invite = inviteSnapshot.data();
  const familyId = invite.familyId as string;
  const existingMemberSnapshot = await getDocs(
    query(
      collection(db, "familyMembers"),
      where("familyId", "==", familyId),
      where("userId", "==", user.uid)
    )
  );

  if (!existingMemberSnapshot.empty) {
    return {
      id: familyId,
      name: invite.name as string,
      alreadyMember: true,
    };
  }

  await upsertFamilyMember({
    familyId,
    inviteCode: normalizedInviteCode,
    user,
    role: "MEMBER",
    relation: "member",
  });

  return {
    id: familyId,
    name: invite.name as string,
    alreadyMember: false,
  };
}

export async function updateFamily({ familyId, name }: UpdateFamilyInput) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("크루 이름을 입력해주세요.");
  }

  if (Array.from(normalizedName).length > MAX_FAMILY_NAME_LENGTH) {
    throw new Error(`크루 이름은 ${MAX_FAMILY_NAME_LENGTH}자 이내로 입력해주세요.`);
  }

  await updateDoc(doc(db, "families", familyId), {
    name: normalizedName,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFamily({ familyId, ownerId }: DeleteFamilyInput) {
  const familySnapshot = await getDoc(doc(db, "families", familyId));

  if (!familySnapshot.exists()) {
    throw new Error("삭제할 크루를 찾을 수 없습니다.");
  }

  const memberSnapshot = await getDocs(
    query(collection(db, "familyMembers"), where("familyId", "==", familyId))
  );
  const ownerMember = memberSnapshot.docs.find(
    (memberDoc) => memberDoc.data().userId === ownerId && memberDoc.data().role === "OWNER"
  );

  if (!ownerMember) {
    throw new Error("크루 삭제는 크루장만 할 수 있습니다.");
  }

  const inviteCode = familySnapshot.data().inviteCode as string | undefined;
  const inviteRef = inviteCode ? doc(db, "familyInvites", inviteCode) : null;
  const inviteSnapshot = inviteRef ? await getDoc(inviteRef) : null;
  const batch = writeBatch(db);
  memberSnapshot.docs.forEach((memberDoc) => batch.delete(memberDoc.ref));
  batch.delete(doc(db, "families", familyId));

  if (inviteRef && inviteSnapshot?.exists()) {
    batch.delete(inviteRef);
  }

  await batch.commit();

  const memberUserIds = memberSnapshot.docs.map((memberDoc) => memberDoc.data().userId as string);

  // Firestore deletion is the source of truth; mirror cleanup must not turn a successful delete into an error.
  await Promise.allSettled([
    ...memberUserIds.map((memberUserId) => clearMemberRealtimeData(familyId, memberUserId)),
    ...memberUserIds.map((memberUserId) =>
      remove(ref(realtimeDb, `familyMembers/${familyId}/${memberUserId}`))
    ),
  ]);
}

export async function leaveFamily({ familyId, userId }: LeaveFamilyInput) {
  const memberRef = doc(db, "familyMembers", `${familyId}_${userId}`);
  const memberSnapshot = await getDoc(memberRef);

  if (!memberSnapshot.exists()) {
    throw new Error("이미 참여하지 않은 크루입니다.");
  }

  if (memberSnapshot.data().role === "OWNER") {
    throw new Error("크루장은 크루를 나갈 수 없습니다. 크루를 삭제하거나 크루장 권한을 넘겨주세요.");
  }

  await clearMemberRealtimeData(familyId, userId);
  await remove(ref(realtimeDb, `familyMembers/${familyId}/${userId}`));
  await deleteDoc(memberRef);
}

async function clearMemberRealtimeData(familyId: string, userId: string) {
  await Promise.all([
    remove(ref(realtimeDb, `liveLocations/${familyId}/${userId}`)),
    remove(ref(realtimeDb, `onlinePresence/${familyId}/${userId}`)),
    remove(ref(realtimeDb, `deviceStatus/${familyId}/${userId}`)),
  ]);
}

export async function getFamiliesForUser(userId: string) {
  const membersQuery = query(
    collection(db, "familyMembers"),
    where("userId", "==", userId)
  );
  const memberSnapshot = await getDocs(membersQuery);

  const familyIds = memberSnapshot.docs.map((memberDoc) => memberDoc.data().familyId as string);
  const familySnapshots = await getDocumentsByIds("families", familyIds);
  const familiesById = new Map(familySnapshots.map((familySnapshot) => [familySnapshot.id, familySnapshot]));

  const families = memberSnapshot.docs.map((memberDoc) => {
    const member = memberDoc.data();
    const familyId = member.familyId as string;
    const role = member.role as FamilyRole;
    const familySnapshot = familiesById.get(familyId);

    if (!familySnapshot?.exists()) {
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
      ownerId: family.ownerId as string,
      role,
      createdAt: family.createdAt,
    };
  });

  return families.filter((family): family is NonNullable<typeof family> => Boolean(family));
}

export async function getFirstFamilyForUser(userId: string) {
  const families = await getFamiliesForUser(userId);

  return families[0] ?? null;
}

export async function getFamilyMembers(
  familyId: string
): Promise<FamilyMemberProfile[]> {
  const membersQuery = query(
    collection(db, "familyMembers"),
    where("familyId", "==", familyId)
  );
  const memberSnapshot = await getDocs(membersQuery);

  const userIds = memberSnapshot.docs.map((memberDoc) => memberDoc.data().userId as string);
  const userSnapshots = await getDocumentsByIds("users", userIds);
  const profilesById = new Map(
    userSnapshots.map((userSnapshot) => [userSnapshot.id, userSnapshot.data()])
  );

  return memberSnapshot.docs.map((memberDoc) => {
    const member = memberDoc.data();
    const userId = member.userId as string;
    const profile = profilesById.get(userId) ?? {};

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
  });
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
    throw new Error("크루 역할은 크루장만 변경할 수 있습니다.");
  }

  if (!targetSnapshot.exists()) {
    throw new Error("변경할 크루 멤버를 찾을 수 없습니다.");
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

export async function deleteFamilyMember({
  actorUserId,
  familyId,
  targetUserId,
}: DeleteFamilyMemberInput) {
  const actorSnapshot = await getDoc(doc(db, "familyMembers", `${familyId}_${actorUserId}`));
  const targetRef = doc(db, "familyMembers", `${familyId}_${targetUserId}`);
  const targetSnapshot = await getDoc(targetRef);

  if (!actorSnapshot.exists() || actorSnapshot.data().role !== "OWNER") {
    throw new Error("크루 멤버 삭제는 크루장만 할 수 있습니다.");
  }

  if (!targetSnapshot.exists()) {
    throw new Error("삭제할 크루 멤버를 찾을 수 없습니다.");
  }

  if (targetSnapshot.data().role === "OWNER") {
    throw new Error("OWNER는 삭제할 수 없습니다.");
  }

  await deleteDoc(targetRef);
  await remove(ref(realtimeDb, `familyMembers/${familyId}/${targetUserId}`));
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
      nickname: user.displayName ?? "크루 멤버",
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

async function getDocumentsByIds(collectionName: "families" | "users", ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);

  if (uniqueIds.length === 0) {
    return [];
  }

  const chunks = Array.from({ length: Math.ceil(uniqueIds.length / 30) }, (_, index) =>
    uniqueIds.slice(index * 30, index * 30 + 30)
  );
  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, collectionName), where(documentId(), "in", chunk)))
    )
  );

  return snapshots.flatMap((snapshot) => snapshot.docs);
}
