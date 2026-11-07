import { MascotCut } from "~/components/mascot-cut";
import type { Qr } from "~/lib/qr";
import type { Certificate } from "~/orpc/certificate/contract";
import { CertificateCard } from "~/routes/account_dog_detail/components/certificate-card";
import { EdgeDog } from "~/routes/account_dog_detail/components/edge-dog";
import { SectionHead } from "~/routes/account_dog_detail/components/section-head";
import { m } from "~/paraglide/messages";

/*===== Certificates Section =====*/
/**
 * F14 on the dog's page: the certificates the center issued for courses the dog finished, each with the link and
 * QR code that let anyone check it. Nothing is shown when there are none: a finished course does not promise one.
 *
 * Beside the heading the `diploma` dog stands with the rolled diploma in his mouth, the easel with its framed
 * certificate dimmed behind him: he presents his buddy's papers. They stand on the sunken panel that holds the cards.
 */
export function CertificatesSection({
  certificates,
}: {
  certificates: { certificate: Certificate; link: string; qr: Qr }[];
}) {
  if (certificates.length === 0) return null;

  return (
    <section aria-labelledby="certificates-title">
      <SectionHead id="certificates-title" title={m.account_dog_detail_certificates_title()}>
        <div className="relative">
          {/* The easel stands behind him on his far side (physical left: he faces right, towards the heading). */}
          <MascotCut name="easel" className="absolute right-[58%] bottom-0 w-[6.5rem] translate-y-[3%] sm:w-32" />
          <EdgeDog name="diploma" className="w-[4.75rem] sm:w-[5.5rem]" />
        </div>
      </SectionHead>

      {/* A sunken panel holds the cards, so he has an edge to stand on; its top padding is the seals' room. */}
      <ul className="relative flex flex-col gap-9 rounded-4xl border border-border/60 bg-sunken paper-grain p-3 pt-9 sm:p-5 sm:pt-10">
        {certificates.map((entry) => (
          <CertificateCard key={entry.certificate.id} {...entry} />
        ))}
      </ul>
    </section>
  );
}
