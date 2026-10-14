import { LegalPage } from "@/components/myroom/legal";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        MyRoom is a noticeboard. Hosts publish a room, a rent, and a phone number. Guests contact them
        directly. We do not take payment, hold deposits, or guarantee that a room is still free.
      </p>
      <p>
        You are responsible for what you post. Don’t list a room you can’t offer, don’t share someone
        else’s number, and don’t use the board to harass people.
      </p>
      <p>
        This demo stores your account, saved rooms, and listings in this browser only. Clearing site data
        removes them.
      </p>
    </LegalPage>
  );
}
