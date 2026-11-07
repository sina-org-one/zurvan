import { cn } from "cn";
import { BadgeCheckIcon, PhoneCallIcon, PlusIcon } from "lucide-react";

import { Link } from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { NEW_DOG_LINK, type DogChoice } from "~/routes/assessment/components/dog-picker";
import { PLATE } from "~/routes/assessment/components/form-plate";
import { TapedPrint } from "~/routes/assessment/components/taped-print";

/*===== Nothing to Ask Plate =====*/
/**
 * In the form's place when every dog is waiting for the call or was evaluated (F3: one open or finished evaluation per
 * dog). The customer's dogs as small prints in a row, each with its state in words under it, so it is plain why there is
 * no form; then the way to the Dashboard, and to a new dog, which could ask.
 */
export function NothingToAskPlate({ dogs }: { dogs: readonly DogChoice[] }) {
  return (
    <section aria-labelledby="nothing-title" className={cn(PLATE, "answer-in p-6 sm:p-8")}>
      <h2 id="nothing-title" className={cn(DISPLAY_HEADING, "text-h2 text-balance")}>
        {m.assessment_nothing_title()}
      </h2>
      <p className="mt-3 max-w-lg text-pretty text-muted-foreground">{m.assessment_nothing_description()}</p>

      {/*------ The Dogs ------*/}
      <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-6">
        {dogs.map((dog, index) => (
          <li key={dog.id} className="flex w-32 flex-col items-center gap-3 text-center">
            <TapedPrint name={dog.name} photo={dog.photo} size="md" tilt={index % 2 ? "rotate-2" : "-rotate-2"} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-extrabold text-primary">
                <bdi>{dog.name}</bdi>
              </p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground">
                {dog.state === "pending" ? (
                  <>
                    <PhoneCallIcon aria-hidden className="size-3.5 shrink-0" />
                    {m.assessment_picker_waiting()}
                  </>
                ) : (
                  <>
                    <BadgeCheckIcon aria-hidden className="size-3.5 shrink-0" />
                    {m.assessment_picker_evaluated()}
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/*------ Ways On ------*/}
      <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-7">
        <Link to="/account" className={buttonVariants({ variant: "solid", size: "lg", className: "sm:min-w-52" })}>
          {m.assessment_receipt_go_dogs()}
        </Link>
        <Link
          {...NEW_DOG_LINK}
          className="inline-flex items-center gap-1.5 self-center rounded-sm text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:self-auto"
        >
          <PlusIcon aria-hidden className="size-4" />
          {m.assessment_picker_new_dog()}
        </Link>
      </div>
    </section>
  );
}
