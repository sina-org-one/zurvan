import { cn } from "cn";
import { ChevronLeftIcon } from "lucide-react";

import { Link } from "~/components/link";
import { HEAD_TRAINER } from "~/lib/head-trainer";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";

/*===== Article Author =====*/
/**
 * Who wrote the post: the head trainer's photo as a small taped print, her name in gold, her trade, her years and her
 * credential, and the way to the About page, where Zurvan and its trainers are introduced. A post has a real, named
 * author, so the reader meets her beside the text (the rail on wide screens) or right after it (phones); she is one of
 * Zurvan's trainers, never presented as the only one. Facts only, from `HEAD_TRAINER`.
 */
export function ArticleAuthor({ className }: { className?: string }) {
  const photo = HEAD_TRAINER.photos.withDog;

  return (
    <aside
      aria-label={m.blog_article_author_aria()}
      className={cn(
        "flex items-start gap-4 rounded-3xl border border-border bg-card paper-grain p-5 shadow-sm",
        className,
      )}
    >
      {/*------ Print ------*/}
      <div className="relative w-20 shrink-0 -rotate-3 sm:w-24">
        <div className="rounded-sm bg-foreground p-1.5 shadow-[0_10px_24px_-12px_rgb(0_0_0/0.9)]">
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="6rem"
            alt=""
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] h-auto w-full object-cover object-top"
          />
        </div>
        <span
          aria-hidden
          className="absolute start-1/2 -top-2 h-4 w-10 -translate-x-1/2 rotate-[4deg] bg-[rgb(214_196_150/0.8)] rtl:translate-x-1/2"
        />
      </div>

      {/*------ Words ------*/}
      <div className="min-w-0">
        <p className="font-display text-xl font-extrabold text-primary">{HEAD_TRAINER.name}</p>
        <p className="mt-1 text-sm leading-6 text-pretty text-foreground/85">{HEAD_TRAINER.role}</p>
        <p className="mt-2 text-xs leading-6 text-pretty text-muted-foreground">
          {m.blog_article_author_years({ years: formatNumber(HEAD_TRAINER.years), since: HEAD_TRAINER.sinceYear })}
          <br />
          {HEAD_TRAINER.credential}
        </p>
        <Link
          to="/about"
          className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {m.blog_article_author_more()}
          <ChevronLeftIcon aria-hidden strokeWidth={2} className="size-4 ltr:-scale-x-100" />
        </Link>
      </div>
    </aside>
  );
}
