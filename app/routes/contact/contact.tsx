import { createFileRoute } from "@tanstack/react-router";

import { CENTER } from "~/lib/contact";
import { pageHead } from "~/lib/seo";
import { AreaBand } from "~/routes/contact/components/area-band";
import { ContactHero } from "~/routes/contact/components/contact-hero";
import { MessagesWall } from "~/routes/contact/components/messages-wall";
import { m } from "~/paraglide/messages";

/*===== Route =====*/
export const Route = createFileRoute("/_public/contact")({
  head: () =>
    pageHead({
      path: "/contact",
      title: m.contact_meta_title(),
      description: m.contact_meta_description({ area: CENTER.serviceArea }),
    }),
  // The last band (the path under the Tehran skyline) runs into the footer, so the shell drops its bottom padding.
  staticData: { flushFooter: true },
  component: ContactPage,
});

/*===== Page =====*/
// Static: no loader. Only the details the owner gave (`app/lib/contact.ts`): the business card, and the second number
// and WhatsApp in place of YouTube (2026-10-26).
function ContactPage() {
  return (
    <>
      <ContactHero />
      <MessagesWall />
      <AreaBand />
    </>
  );
}
