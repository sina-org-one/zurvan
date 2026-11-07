import { cn } from "cn";
import { DownloadIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "~/components/brand-logo";
import { ChalkBubble } from "~/components/chalk-bubble";
import { CopyLinkButton } from "~/components/copy-link-button";
import { MascotCut } from "~/components/mascot-cut";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { downloadQrPng } from "~/lib/qr-png";
import { m } from "~/paraglide/messages";
import { PLATE } from "~/routes/account_partner/plate";
import type { Qr } from "~/lib/qr";

/*===== Shop Card =====*/
/**
 * «لینک و QR تو», the page's memorable picture: the printed card the partner keeps by his till, standing on the shop's
 * counter, and the center's dog sitting at the counter's end scanning it with his phone. The card is an ivory tile with
 * the QR on pure white, since a dark code on a black page would not scan; nothing is drawn over it. Under the counter,
 * the link to paste anywhere and a PNG to print.
 *
 * The tile stands on the counter's top: the row holding it ends on the top's line because the counter is pulled up by
 * the share of its own height above that line (a percentage margin is a share of the width, and the picture's
 * proportions are fixed). The counter is mirrored so its card stand hides behind the tile and its bowl of kibble sits
 * by the dog. Physical sides there: they follow the picture, not the reading direction.
 *
 * Motion (page-motion.tsx): the tile drops onto the counter and settles on its tilt (`pd-drop`); the dog breathes, his
 * bubble floats. The copy button's icon turns into a check; while the PNG is made, the download icon turns into a
 * spinner.
 */
export function ShopCard({ link, qr, isPartner }: { link: string; qr: Qr; isPartner: boolean }) {
  return (
    <section aria-labelledby="partner-shop-title" className={cn(PLATE, "lg:p-6 xl:p-7")}>
      <h2 id="partner-shop-title" className={cn(DISPLAY_HEADING, "text-h2 text-balance")}>
        {m.account_partner_shop_title()}
      </h2>

      {/*===== Counter Stage =====*/}
      <div aria-hidden className="relative mt-5">
        {/* A pool of warm light over the counter. */}
        <div className="absolute -inset-x-4 top-[10%] bottom-[20%] bg-[radial-gradient(ellipse_55%_50%_at_50%_70%,rgb(255_194_26/0.08),transparent)]" />

        {/*------ On the Counter ------*/}
        <div className="relative z-10 flex">
          {/* The card, propped by the till: tilted from its right foot, so its left foot lifts a little. */}
          <div className="pd-drop mr-[5%] ml-auto w-[12.5rem] origin-bottom-right -rotate-2 sm:w-[14rem]">
            <QrTile qr={qr} />
          </div>

          {/* The dog at the counter's left end, his phone up at the card. His head is about 70% across him; the
              bubble's tail (2.25rem in from its right edge) is aimed at it, and the bubble ends before the card. */}
          <div className="absolute bottom-0 left-0 w-[5.25rem] translate-y-[4%] sm:left-[3%] sm:w-[7rem]">
            <div className="lively-pet">
              <MascotCut name="smartphone" className="lively-breathe block w-full" />
            </div>
            <ChalkBubble
              tail="right"
              className="pd-scan absolute right-[calc(30%-2.25rem)] bottom-[calc(100%+0.25rem)] w-max max-w-none whitespace-nowrap"
            >
              {/* Two short lines, broken by hand: the bubble has only the room left of the card. */}
              {m.account_partner_shop_bubble_line_1()}
              <br />
              {m.account_partner_shop_bubble_line_2()}
            </ChalkBubble>
          </div>
        </div>

        {/*------ The Counter ------*/}
        {/* Things stand on its top at about 20.5% of its height (434x292): 20.5% x 292/434 = 13.8% of its width. */}
        <MascotCut name="counter" className="relative -mt-[14.4%] block w-full -scale-x-100" />
      </div>

      {/*===== Link and Actions =====*/}
      <div className="mt-5 flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card paper-grain py-2 ps-4 pe-2">
          {/* The link is Latin: `ltr` keeps its slashes and dots in order, and the button stays outside it. */}
          <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-sm text-muted-foreground tabular-nums">
            {link}
          </span>
          <CopyLinkButton link={link} />
        </div>
        <DownloadButton qr={qr} />
        <p className="text-sm text-muted-foreground">
          {isPartner ? m.account_partner_shop_hint() : m.account_partner_shop_hint_customer()}
        </p>
      </div>
    </section>
  );
}

/*===== QR Tile =====*/
/** The printed card itself: the brand, the code on pure white, the caption. Its own surface is ivory, never dimmed. */
function QrTile({ qr }: { qr: Qr }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-foreground p-3.5 text-background shadow-[0_18px_30px_-16px_rgb(0_0_0/0.95)] ring-1 ring-background/15 ring-inset sm:p-4">
      <BrandLogo className="text-[1.15rem]" />
      <div className="w-full rounded-xl bg-white p-2.5">
        <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="block h-auto w-full">
          <path fill="#000" d={qr.path} />
        </svg>
      </div>
      <p className="text-center text-sm leading-snug font-bold text-balance">{m.account_partner_shop_caption()}</p>
    </div>
  );
}

/*===== Download Button =====*/
/**
 * «دانلود QR»: the code and its caption as a PNG to print. While it is made, the button is disabled and its icon turns
 * into a spinner (the two icons share one grid cell and turn into each other). A failure says so in a toast.
 */
function DownloadButton({ qr }: { qr: Qr }) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleDownload() {
    setIsSaving(true);
    try {
      await downloadQrPng({
        path: qr.path,
        size: qr.size,
        caption: m.account_partner_shop_caption(),
        fileName: "k9-qr.png",
      });
    } catch {
      toast.add({ title: m.account_partner_shop_download_failed(), type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="h-11 w-full" onClick={handleDownload} disabled={isSaving}>
      <span aria-hidden className="grid size-5 place-items-center *:col-start-1 *:row-start-1">
        <DownloadIcon
          className={cn("size-5 transition-all duration-300", isSaving && "scale-50 rotate-90 opacity-0")}
        />
        <LoaderCircleIcon
          className={cn(
            "size-5 transition-all duration-300 motion-safe:animate-spin",
            !isSaving && "scale-50 -rotate-90 opacity-0",
          )}
        />
      </span>
      {m.account_partner_shop_download()}
    </Button>
  );
}
