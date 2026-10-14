import { LegalPage } from "@/components/myroom/legal";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        The name and mobile number you add stay in this browser so hosts can be called from a listing. They
        are not sent to a server in this demo.
      </p>
      <p>Room photos you upload are kept for the current visit. Saved rooms and reports use local storage.</p>
      <p>Continue with Google is a preview of the account step. It does not contact Google.</p>
    </LegalPage>
  );
}
