export type PolicyDocumentId = "terms" | "privacy" | "location" | "notices";

export type PolicySection = {
  body: string;
  title: string;
};

export type PolicyDocument = {
  description: string;
  sections: PolicySection[];
  title: string;
};

export const POLICY_VERSION = "2026-09-16";

export const policyDocuments: Record<PolicyDocumentId, PolicyDocument> = {
  terms: {
    title: "서비스 이용약관",
    description: "우리끼리 MVP 서비스 이용에 필요한 기본 약속이에요.",
    sections: [
      {
        title: "서비스 이용",
        body: "우리끼리는 크루 구성원이 위치, 일정, 메모, 투표, 채팅을 함께 관리할 수 있도록 제공하는 서비스예요. Google 계정으로 로그인하면 서비스 이용을 시작할 수 있어요.",
      },
      {
        title: "사용자 책임",
        body: "초대 코드와 크루 안의 정보는 필요한 사람에게만 공유해주세요. 다른 사람의 개인정보나 위치를 동의 없이 수집·공유하거나, 서비스 운영을 방해하는 행위는 할 수 없어요.",
      },
      {
        title: "탈퇴와 이용 제한",
        body: "설정에서 회원탈퇴를 요청할 수 있어요. 크루장인 경우 크루를 먼저 삭제해야 해요. 운영에 필요한 경우 서비스 이용이 제한될 수 있고, 중요한 변경은 공지로 안내해요.",
      },
    ],
  },
  privacy: {
    title: "개인정보 처리방침",
    description: "현재 MVP에서 처리하는 정보와 이용 목적을 안내해요.",
    sections: [
      {
        title: "처리하는 정보",
        body: "Google 로그인에서 받은 사용자 식별자, 이름, 이메일, 프로필 이미지와 사용자가 입력한 닉네임을 처리해요. 크루의 멤버·역할·초대 코드, 일정·메모·투표·채팅 내용도 기능 제공을 위해 저장해요.",
      },
      {
        title: "위치 정보",
        body: "사용자가 위치 공유를 시작한 경우에만 현재 위도·경도와 갱신 시각을 처리해요. 공유 중인 위치는 참여 중인 크루 멤버에게 표시되고, 위치 공유를 끄거나 로그아웃·탈퇴하면 실시간 위치 데이터를 삭제해요.",
      },
      {
        title: "보관과 삭제",
        body: "서비스 이용 중 필요한 기간 동안 정보를 보관해요. 회원탈퇴 또는 크루 탈퇴 시 서비스에서 관리하는 계정 연결·실시간 위치 데이터는 삭제 대상이 돼요. 일정·메모·투표·채팅은 작성자와 크루 권한에 따라 직접 삭제할 수 있어요.",
      },
      {
        title: "처리 위탁 및 외부 서비스",
        body: "Google 로그인과 데이터 저장·호스팅을 위해 Firebase와 Google Cloud를 사용해요. 지도 표시와 좌표 주소 변환을 위해 Kakao Maps JavaScript SDK를 사용해요. Firebase Firestore 데이터베이스는 서울 리전, Realtime Database는 싱가포르 리전을 사용해요.",
      },
      {
        title: "이용자 권리와 문의",
        body: "내 정보와 설정에서 프로필을 수정하고 회원탈퇴를 요청할 수 있어요. 운영자명, 사업자 정보, 문의 이메일과 법정 보관 기간은 정식 공개 전에 실제 운영 정보로 보완해야 해요.",
      },
    ],
  },
  location: {
    title: "위치정보 이용 안내",
    description: "위치 공유를 켤 때 어떤 일이 일어나는지 안내해요.",
    sections: [
      {
        title: "수집 목적",
        body: "크루 멤버가 서로의 현재 위치를 확인할 수 있도록 위치 정보를 사용해요. 위치 공유는 기본으로 켜지지 않고, 사용자가 직접 시작할 때만 요청해요.",
      },
      {
        title: "공유 범위와 주기",
        body: "현재 선택한 크루의 멤버에게만 위치가 보여요. 이동이 감지될 때 최대 10초 간격으로 갱신하고, 움직임이 없으면 불필요한 전송을 줄여요.",
      },
      {
        title: "끄기와 백그라운드 안내",
        body: "홈의 위치 공유 끄기 버튼으로 즉시 중단할 수 있어요. 브라우저와 운영체제의 백그라운드 정책에 따라 앱이 완전히 종료된 뒤에는 위치 공유가 계속되지 않을 수 있어요.",
      },
      {
        title: "권한을 거절한 경우",
        body: "위치 권한을 허용하지 않아도 일정, 메모, 투표, 채팅은 사용할 수 있어요. 나중에 위치 공유하기를 다시 누르거나 브라우저 설정에서 권한을 바꿀 수 있어요.",
      },
    ],
  },
  notices: {
    title: "공지사항",
    description: "서비스 변경과 중요한 소식을 알려드려요.",
    sections: [
      {
        title: "현재 공지",
        body: "새로운 공지가 없어요. 서비스에 중요한 변경이 생기면 이곳에서 안내할게요.",
      },
    ],
  },
};
