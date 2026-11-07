import { latinNameAddsToTitle } from "~/lib/course-format";
import { CheckIcon } from "lucide-react";

import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { CENTER } from "~/lib/contact";
import { formatTimestamp } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";

/*===== Valid Card =====*/
/**
 * The result card of a valid certificate: a grained card with a thin gold frame set in from its edge (like a document's
 * margin) and the facts as a definition list. The seal is stamped over its top end corner and overhangs the edge, so
 * the first row keeps end padding wider than the seal (the course's title and Latin name run under it otherwise).
 *
 * The seal is the rosette cut-out with a drawn check on its blank cream centre. It stamps on at 0.5s (`cv-stamp`): big
 * and tilted, it lands with a tiny overshoot, then rests at a slight angle. The card rises in just before it. Both are
 * off for reduced motion, which shows the finished card.
 */
export function ValidCard({
  course,
  dogName,
  issuedAt,
  number,
}: {
  course: { title: string; latinName: string };
  dogName: string | null;
  issuedAt: Date;
  number: string;
}) {
  return (
    <div className="cv-card relative mt-8 max-w-xl rounded-4xl border border-border bg-card paper-grain p-6 shadow-[0_24px_50px_-26px_rgb(0_0_0/0.9)] sm:p-8">
      {/* The frame: flat gold at low alpha, set in a few pixels. */}
      <div aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[1.625rem] border border-primary/25" />

      {/*------ Seal ------*/}
      <div
        aria-hidden
        className="pointer-events-none absolute end-4 -top-7 z-10 size-[5.25rem] rotate-[-9deg] sm:end-6 sm:-top-8 sm:size-28"
      >
        <div className="cv-seal relative size-full">
          <MascotCut name="seal-disc" className="block size-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.55)]" />
          <CheckIcon
            strokeWidth={3.2}
            className="absolute inset-[27%] size-[46%] text-[#8a5f00] drop-shadow-[0_1px_0_rgb(255_240_190/0.7)]"
          />
        </div>
      </div>

      {/*------ Facts ------*/}
      <dl className="relative divide-y divide-dashed divide-primary/20">
        <Fact label={m.certificate_valid_course()} className="pe-20 pt-0 sm:pe-28">
          <dd className="font-display text-xl font-extrabold text-pretty sm:text-2xl">{course.title}</dd>
          {latinNameAddsToTitle(course) && (
            <dd dir="ltr" className="mt-0.5 w-fit text-start text-sm text-muted-foreground">
              {course.latinName}
            </dd>
          )}
        </Fact>
        {dogName && (
          <Fact label={m.certificate_valid_dog()}>
            <dd className="font-bold text-pretty">{dogName}</dd>
          </Fact>
        )}
        <Fact label={m.certificate_valid_issued()}>
          <dd className="font-bold">{formatTimestamp(issuedAt)}</dd>
        </Fact>
        <Fact label={m.certificate_valid_issuer()}>
          <dd className="font-bold">
            <Link to="/about" className="underline decoration-primary/50 underline-offset-4 hover:decoration-primary">
              {CENTER.name}
            </Link>
          </dd>
        </Fact>
        <Fact label={m.certificate_valid_number()} className="pb-0">
          <dd dir="ltr" className="text-start font-mono text-lg font-bold tracking-wider break-all text-primary">
            {number}
          </dd>
        </Fact>
      </dl>
    </div>
  );
}

/** One row: the label above its value on phones, beside it from `sm` up. */
function Fact({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    // The values are direct children of the row (a `dl` only allows `dt`/`dd` in its row wrappers), so each one is put in
    // the second column by hand: a second `dd` would otherwise wrap under the label.
    <div
      className={`py-4 sm:grid sm:grid-cols-[8rem_1fr] sm:items-baseline sm:gap-x-4 sm:[&>dd]:col-start-2 ${className}`}
    >
      <dt className="mb-1 text-sm text-muted-foreground sm:mb-0">{label}</dt>
      {children}
    </div>
  );
}
