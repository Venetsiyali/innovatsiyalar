import { auth } from "@/auth";
import { PageHeader } from "@/components/field";
import { ProposalList } from "@/components/proposal-list";
import { t } from "@/lib/i18n";

export default async function MyProposalsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const [{ sent }, session] = await Promise.all([searchParams, auth()]);
  return (
    <>
      <PageHeader title={t("proposals.mine")} />
      {sent && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{t("proposals.sent")}</p>}
      <ProposalList where={{ teacherId: session!.user.id }} />
    </>
  );
}
