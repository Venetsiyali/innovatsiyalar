import { PageHeader } from "@/components/field";
import { ProposalList } from "@/components/proposal-list";
import { t } from "@/lib/i18n";

export default async function AdminProposalsPage({ searchParams }: { searchParams: Promise<{ approved?: string; rejected?: string }> }) {
  const { approved, rejected } = await searchParams;
  return (
    <>
      <PageHeader title={t("proposals.title")} />
      {(approved || rejected) && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {approved ? t("proposals.approvedOk", { count: approved }) : t("proposals.rejectedOk")}
        </p>
      )}
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-semibold">{t("proposals.pending")}</h2>
          <ProposalList where={{ status: "PENDING" }} review />
        </section>
        <section className="space-y-3">
          <h2 className="font-semibold">{t("proposals.history")}</h2>
          <ProposalList where={{ status: { not: "PENDING" } }} review />
        </section>
      </div>
    </>
  );
}
