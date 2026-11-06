import { cn } from "cn";

import { MascotCut } from "~/components/mascot-cut";
import { formatDate } from "~/lib/locale-format";
import type { LogbookEntry } from "~/orpc/logbook/contract";
import { EdgeDog } from "~/routes/account_dog_detail/components/edge-dog";
import { SectionHead } from "~/routes/account_dog_detail/components/section-head";
import { m } from "~/paraglide/messages";

/*===== Logbook Section =====*/
/**
 * F14 on the dog's page: the diary the trainer writes after each session, newest first, read-only for the owner
 * and private (only the owner and the center see it). The public record's chalk timeline, copied here: a dashed gold line down the start side, a dot per entry, each entry a grained
 * card with the day as its heading, the notes, the exercises as chips and «جمع‌بندی».
 *
 * The `write` dog lies on the section's top edge writing in his notebook. With no entry yet the dimmed lectern stands
 * behind him, and the plate shows the timeline's shape faintly (the line and one empty dot) beside what will go there.
 *
 * Motion: the chalk line draws itself down as the list scrolls through (`dd-draw`); the cards rise in.
 */
export function LogbookSection({ entries }: { entries: LogbookEntry[] }) {
  const empty = entries.length === 0;

  return (
    <section aria-labelledby="logbook-title">
      {/* «لاگ‌بوک» is the owner's word for the dog's file (2026-10-19): it is named first so it can be found by it. */}
      <SectionHead id="logbook-title" title={m.account_dog_detail_logbook_title()}>
        {/* On phones the lectern needs the room the corner's margin would take. It stands on the outer side (logical
            `start-[80%]`), so on the English page too it keeps clear of the heading. */}
        <div className={cn("relative", empty && "me-8 sm:me-0")}>
          {empty && (
            <MascotCut name="lectern" className="absolute start-[80%] bottom-0 w-16 translate-y-[3%] sm:w-24" />
          )}
          <EdgeDog name="write" wide className="w-28 sm:w-36" />
        </div>
      </SectionHead>

      <div className="relative rounded-4xl border border-border/60 bg-sunken paper-grain p-4 sm:p-6">
        {/*------ The Chalk Line ------*/}
        <svg
          aria-hidden
          className={cn(
            "pointer-events-none absolute start-[calc(1rem+1.05rem)] top-8 bottom-8 h-[calc(100%-4rem)] w-1 sm:start-[calc(1.5rem+1.05rem)]",
            empty ? "text-primary/25" : "dd-draw text-primary/60",
          )}
          preserveAspectRatio="none"
          viewBox="0 0 4 100"
        >
          <line
            x1="2"
            x2="2"
            y1="0"
            y2="100"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="1.5 2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
        </svg>

        {empty ? (
          /*------ Nothing Yet ------*/
          <div className="relative py-2 ps-12">
            <span
              aria-hidden
              className="absolute start-[0.55rem] top-3 size-4 rounded-full border-2 border-dashed border-primary/50 bg-sunken"
            />
            <p className="font-bold">{m.account_dog_detail_logbook_empty_title()}</p>
            <p className="mt-1 max-w-md text-sm text-pretty text-muted-foreground">
              {m.account_dog_detail_logbook_empty_text()}
            </p>
          </div>
        ) : (
          /*------ Entries ------*/
          <ol className="relative flex flex-col gap-5">
            {entries.map((entry) => (
              <li key={entry.id} className="lively-reveal relative ps-12">
                <span
                  aria-hidden
                  className="absolute start-[0.55rem] top-6 size-4 rounded-full border-[3px] border-primary bg-sunken"
                />
                <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card paper-grain p-5 shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-lg font-extrabold">
                      <time dateTime={entry.occurredOn}>{formatDate(entry.occurredOn)}</time>
                    </h3>
                    {entry.course && <span className="text-sm text-muted-foreground">{entry.course.title}</span>}
                  </div>
                  {/* The Admin's own words (Persian): `dir="auto"` and `<bdi>` keep their direction on the English page. */}
                  <p dir="auto" className="text-pretty whitespace-pre-line">
                    {entry.notes}
                  </p>
                  {entry.exercises.length > 0 && (
                    <ul aria-label={m.account_dog_detail_logbook_exercises()} className="flex flex-wrap gap-2">
                      {entry.exercises.map((exercise) => (
                        <li key={exercise} className="rounded-full border border-primary/40 px-3 py-1 text-sm">
                          {exercise}
                        </li>
                      ))}
                    </ul>
                  )}
                  {entry.progress && (
                    <p className="text-sm text-pretty text-muted-foreground">
                      <span className="font-bold text-foreground">{m.account_dog_detail_logbook_summary()} </span>
                      <bdi>{entry.progress}</bdi>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
