"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createUser,
  resetUserPassword,
  updateUser,
  type AdminUserItem,
} from "@/lib/actions/admin";

type Props = {
  users: AdminUserItem[];
  currentUserId: string;
};

const ROLE_LABELS = { ADMIN: "管理者", MEMBER: "メンバー" } as const;

export function AdminUsers({ users, currentUserId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserItem | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUserItem | null>(
    null,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ユーザー一覧</h2>
        <Button onClick={() => setCreateOpen(true)}>ユーザーを追加</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>氏名</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>鍵</TableHead>
            <TableHead className="text-right">上限交通費</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{ROLE_LABELS[user.role]}</TableCell>
              <TableCell>{user.hasKey ? "🔑 あり" : "なし"}</TableCell>
              <TableCell className="text-right">
                {user.transportCostLimit > 0
                  ? `${user.transportCostLimit.toLocaleString()} 円`
                  : "未設定"}
              </TableCell>
              <TableCell className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditTarget(user)}
                >
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordTarget(user)}
                >
                  パスワード再設定
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <UserFormDialog
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {editTarget && (
        <UserFormDialog
          key={editTarget.id}
          mode="edit"
          user={editTarget}
          currentUserId={currentUserId}
          open
          onClose={() => setEditTarget(null)}
        />
      )}
      {passwordTarget && (
        <PasswordResetDialog
          key={passwordTarget.id}
          user={passwordTarget}
          open
          onClose={() => setPasswordTarget(null)}
        />
      )}
    </section>
  );
}

type UserFormDialogProps = {
  mode: "create" | "edit";
  user?: AdminUserItem;
  currentUserId?: string;
  open: boolean;
  onClose: () => void;
};

function UserFormDialog({
  mode,
  user,
  currentUserId,
  open,
  onClose,
}: UserFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isSelf = mode === "edit" && user?.id === currentUserId;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "MEMBER"),
      hasKey: formData.get("hasKey") === "on",
      transportCostLimit: Number(formData.get("transportCostLimit") ?? 0),
    };

    setIsPending(true);
    setError(null);
    try {
      const result =
        mode === "create"
          ? await createUser({
              ...input,
              password: String(formData.get("password") ?? ""),
            })
          : await updateUser(user!.id, input);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch {
      setError("操作に失敗しました");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "ユーザーを追加" : "ユーザーを編集"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name">氏名</Label>
            <Input
              id="user-name"
              name="name"
              defaultValue={user?.name ?? ""}
              required
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">メールアドレス</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              required
              disabled={isPending}
            />
          </div>
          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-password">初期パスワード</Label>
              <Input
                id="user-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={isPending}
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-role">ロール</Label>
            {/* 2択のため shadcn の Select ではなく軽量なネイティブ select を意図的に使用 */}
            <select
              id="user-role"
              name="role"
              defaultValue={user?.role ?? "MEMBER"}
              disabled={isPending || isSelf}
              className="border-input h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="MEMBER">メンバー</option>
              <option value="ADMIN">管理者</option>
            </select>
            {isSelf && (
              <p className="text-muted-foreground text-xs">
                自分自身のロールは変更できません
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hasKey"
              defaultChecked={user?.hasKey ?? false}
              disabled={isPending}
            />
            鍵所持
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-transport-cost-limit">
              上限交通費（円 / 月。0 = 未設定）
            </Label>
            <Input
              id="user-transport-cost-limit"
              name="transportCostLimit"
              type="number"
              min={0}
              step={1}
              defaultValue={user?.transportCostLimit ?? 0}
              required
              disabled={isPending}
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending
              ? "保存中..."
              : mode === "create"
                ? "追加する"
                : "保存する"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PasswordResetDialogProps = {
  user: AdminUserItem;
  open: boolean;
  onClose: () => void;
};

function PasswordResetDialog({
  user,
  open,
  onClose,
}: PasswordResetDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsPending(true);
    setError(null);
    try {
      const result = await resetUserPassword(
        user.id,
        String(formData.get("newPassword") ?? ""),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch {
      setError("操作に失敗しました");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>パスワード再設定（{user.name}）</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            再設定すると対象ユーザーのログイン中セッションは失効します。
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              disabled={isPending}
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? "再設定中..." : "再設定する"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
