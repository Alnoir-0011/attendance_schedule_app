import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">出社予定カレンダー</h1>
      <p className="text-muted-foreground">
        誰がいつ出社するかをカレンダーで共有するアプリ
      </p>
      <Button>はじめる</Button>
    </main>
  );
}
