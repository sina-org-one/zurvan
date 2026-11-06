import { ArrowUpLeft, MapPin, Phone } from "lucide-react";

import { linkOptions } from "@tanstack/react-router";

import { Link } from "~/components/link";
import { CENTER, CENTER_LINKS, CENTER_PHONE, CENTER_PHONE_SECOND } from "~/lib/contact";
import { ZURVAN_SINCE } from "~/lib/head-trainer";
import { SITE_RULES } from "~/lib/site-rules";
import { BrandEmblem } from "~/components/brand-emblem";
import { SOCIAL_ICONS } from "~/components/social-icons";
import { LanguageSwitch } from "~/components/language-switch";
import { m } from "~/paraglide/messages";

/*===== Footer =====*/
// The storefront's facts, laid out as a full-width band: the brand with its social links, three
// link groups, and how to reach the center, over a copyright line. Gold only marks the contact icons, as everywhere
// on this page. On the home page the closing scene's dog stands on the band's top edge. A function, not a constant:
// the titles and labels are messages, worded in the page's language when the footer renders.
function footerGroups() {
  return [
    {
      title: m.layout_public_footer_courses(),
      links: [{ label: m.layout_public_footer_all_courses(), link: linkOptions({ to: "/courses" }) }],
    },
    {
      title: m.layout_public_footer_connect(),
      links: [
        { label: m.layout_public_footer_about(), link: linkOptions({ to: "/about" }) },
        { label: m.layout_public_footer_contact_us(), link: linkOptions({ to: "/contact" }) },
        { label: m.layout_public_footer_partner(), link: linkOptions({ to: "/join/partner" }) },
      ],
    },
    {
      title: m.layout_public_footer_help(),
      links: [
        { label: m.layout_public_footer_faq(), link: linkOptions({ to: "/help" }) },
        { label: m.layout_public_footer_blog(), link: linkOptions({ to: "/blog" }) },
        // The lookup, with no file number (an omitted param would keep the one on a dog's record page).
        {
          label: m.layout_public_footer_logbook(),
          link: linkOptions({ to: "/logbook/{-$fileNumber}", params: { fileNumber: undefined } }),
        },
        // Only once the owner has approved the wording.
        ...(SITE_RULES ? [{ label: m.layout_public_footer_rules(), link: linkOptions({ to: "/rules" }) }] : []),
      ],
    },
  ];
}

const FOOTER_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const FOOTER_LINK = `rounded text-foreground/70 transition-colors hover:text-foreground ${FOOTER_FOCUS}`;

/** The storefront footer on every public page; below `lg` it leaves room at the bottom for the tab bar. */
export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/10 bg-card paper-grain text-sm text-foreground/85">
      {/* Below lg the bottom padding clears the tab bar. */}
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-[calc(var(--tab-bar-space)+2rem)] md:px-8 md:pt-24 lg:pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-[1.9fr_repeat(3,minmax(0,1fr))_1.3fr] lg:gap-x-10">
          {/*------ Brand ------*/}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className={`inline-flex items-center gap-3 rounded ${FOOTER_FOCUS}`}>
              <BrandEmblem className="size-14" />
              <span className="flex flex-col leading-tight">
                <span className="font-display text-3xl font-black text-foreground">{CENTER.name}</span>
                <span className="mt-0.5 text-xs text-foreground/65">{CENTER.descriptor}</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm leading-7 text-pretty text-foreground/70">
              {m.layout_public_footer_about_line({ year: ZURVAN_SINCE.sinceYear })}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {CENTER_LINKS.map((item) => {
                const Icon = SOCIAL_ICONS[item.href];
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={`flex items-center gap-2 rounded-xl border border-foreground/15 px-3 py-1.5 text-foreground/85 transition-colors hover:border-foreground/35 hover:text-foreground ${FOOTER_FOCUS}`}
                    >
                      <Icon className="size-[1.125rem] text-primary" />
                      {item.label}
                      <ArrowUpLeft aria-hidden className="size-3.5 text-foreground/50 ltr:-scale-x-100" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/*------ Link groups ------*/}
          {footerGroups().map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="font-display text-base font-bold text-foreground">{group.title}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map(({ label, link }) => (
                  <li key={link.to}>
                    <Link {...link} className={FOOTER_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/*------ Reach the center ------*/}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <h2 className="font-display text-base font-bold text-foreground">{m.layout_public_footer_reach()}</h2>
            <ul className="mt-4 flex flex-col gap-3.5">
              {[CENTER_PHONE, CENTER_PHONE_SECOND].map((phone) => (
                <li key={phone.tel} className="flex items-center gap-2.5">
                  <Phone aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
                  <a
                    href={`tel:${phone.tel}`}
                    dir="ltr"
                    className={`rounded font-bold text-foreground tabular-nums hover:underline ${FOOTER_FOCUS}`}
                  >
                    {phone.display}
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-2.5">
                <MapPin aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
                {m.layout_public_footer_area({ area: CENTER.serviceArea })}
              </li>
            </ul>
          </div>
        </div>

        {/*------ Bottom bar ------*/}
        <div className="mt-12 flex flex-col gap-3 border-t border-foreground/10 pt-6 text-xs text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{m.layout_public_footer_copyright()}</p>
          <div className="flex items-center gap-5 self-start">
            <LanguageSwitch className={`${FOOTER_LINK} text-foreground/60`} />
            <Link to="/privacy" className={`${FOOTER_LINK} text-foreground/60`}>
              {m.layout_public_footer_privacy()}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
