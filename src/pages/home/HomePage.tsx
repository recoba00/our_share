import { BatteryHigh, CalendarDots, MapPin, Note, UsersThree } from "@phosphor-icons/react";
import { Card } from "../../components/common/Card";

const family = [
  { name: "아빠", place: "회사", time: "5분 전", battery: "83%" },
  { name: "엄마", place: "집", time: "방금", battery: "충전 중" },
  { name: "나", place: "학교 근처", time: "12분 전", battery: "61%" },
];

export function HomePage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-slate-800 p-6 text-white shadow-lg">
        <p className="text-sm font-semibold opacity-80">오늘의 가족 상황</p>
        <h2 className="mt-2 text-3xl font-black leading-tight">
          모두의 위치와 일정을 한눈에 확인해요
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {family.map((member) => (
            <div key={member.name} className="rounded-2xl bg-white/14 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <strong>{member.name}</strong>
                <BatteryHigh size={18} />
              </div>
              <p className="mt-3 flex items-center gap-1 text-sm">
                <MapPin size={16} weight="fill" />
                {member.place}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {member.time} · {member.battery}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4">
        <Card>
          <div className="flex items-center gap-2">
            <CalendarDots className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-bold">이달의 일정</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between"><span>가족 외식</span><strong>오늘 18:30</strong></li>
            <li className="flex justify-between"><span>할머니 생신</span><strong>D-7</strong></li>
            <li className="flex justify-between"><span>아빠 휴무</span><strong>9/18</strong></li>
          </ul>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Note className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-bold">최근 메모와 투표</h3>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-3">마트에서 우유 사오기</p>
            <p className="rounded-xl bg-brand-soft p-3 text-emerald-800">주말 메뉴 투표 진행 중</p>
          </div>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <UsersThree className="text-brand" size={22} weight="bold" />
          <h3 className="text-base font-bold">다음 구현 대상</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Google 로그인, 가족 생성, 초대 코드 생성 흐름을 Firebase와 연결합니다.
        </p>
      </Card>
    </div>
  );
}
