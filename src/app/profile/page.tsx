import { AppShell } from "@/components/myroom/shell";
import { AuthGate } from "@/components/myroom/auth-gate";
import { ProfileView } from "@/components/myroom/profile";

export default function ProfilePage() {
  return (
    <AppShell>
      <AuthGate>
        <ProfileView />
      </AuthGate>
    </AppShell>
  );
}
