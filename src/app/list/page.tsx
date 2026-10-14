import { ListRoomForm } from "@/components/myroom/list-form";
import { AuthGate } from "@/components/myroom/auth-gate";
import { AppShell } from "@/components/myroom/shell";

export default function ListPage() {
  return (
    <AppShell>
      <AuthGate>
        <ListRoomForm />
      </AuthGate>
    </AppShell>
  );
}
