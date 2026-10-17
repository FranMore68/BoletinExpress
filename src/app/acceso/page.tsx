import { AccessPanel } from "@/components/access-panel";
export const dynamic = "force-dynamic";
export default function AccessPage() {
  return <AccessPanel localMailbox={process.env.LOCAL_MAILBOX_URL} />;
}
