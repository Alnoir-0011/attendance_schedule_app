"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileSettings,
  type ProfileFormState,
} from "@/lib/actions/profile";

type Props = {
  dailyTransportCost: number;
  notifyEmail: boolean;
  notifySlack: boolean;
};

const initialState: ProfileFormState = {};

export function ProfileForm({
  dailyTransportCost,
  notifyEmail,
  notifySlack,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    updateProfileSettings,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      {/* defaultValue（非制御）を採用: 保存成功時は revalidatePath で RSC から最新値が
          渡り、入力値 = サーバー値となるため通常フローで表示ずれは起きない */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="daily-transport-cost">1日あたり交通費（円）</Label>
        <Input
          id="daily-transport-cost"
          name="dailyTransportCost"
          type="number"
          min={0}
          step={1}
          defaultValue={dailyTransportCost}
          required
          disabled={isPending}
        />
      </div>

      {/* 単純な ON/OFF のため shadcn の Checkbox ではなく軽量なネイティブ checkbox を意図的に使用
          （label で包んでおりアクセシビリティは確保済み） */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          通知設定（配信は今後対応予定。設定のみ保存されます）
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyEmail"
            defaultChecked={notifyEmail}
            disabled={isPending}
          />
          メール通知
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifySlack"
            defaultChecked={notifySlack}
            disabled={isPending}
          />
          Slack 通知
        </label>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          保存しました
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "保存中..." : "保存する"}
      </Button>
    </form>
  );
}
