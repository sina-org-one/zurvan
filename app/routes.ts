import { index, layout, rootRoute, route } from "@tanstack/virtual-file-routes";

/*===== Route Tree =====*/
// Declared in code over the flat slices in `app/routes/` (file paths are relative to that folder). TanStack Start's
// plugin turns this into `app/routeTree.gen.ts`.
export const routes = rootRoute("../root.tsx", [
  /*===== Storefront =====*/
  // A pathless layout: its id is `/_public`, which is how its pages' `createFileRoute` paths start.
  layout("public", "layout_public/layout-public.tsx", [
    index("home/home.tsx"),
    route("/courses", "course_catalogue/course-catalogue.tsx"),
    // The purchase page that starts from the dog (customers only).
    route("/buy", "buy/buy.tsx"),
    route("/courses/$slug", "course_detail/course-detail.tsx"),
    route("/assessment", "assessment/assessment.tsx"),
    route("/help", "help/help.tsx"),
    route("/about", "about/about.tsx"),
    route("/contact", "contact/contact.tsx"),
    route("/privacy", "privacy/privacy.tsx"),
    // A 404 until the owner approves the rules' wording (`app/lib/site-rules.ts`).
    route("/rules", "rules/rules.tsx"),
    // A dog's record: the lookup, and what its QR code opens (private unless its owner says otherwise).
    route("/logbook/{-$fileNumber}", "logbook/logbook.tsx"),
    // Checks a certificate: what its QR code opens.
    route("/certificate/$number", "certificate/certificate.tsx"),
    route("/join/partner", "join_partner/join-partner.tsx"),
    // The head trainer's articles (F16): the list with its sections and search, and one article.
    route("/blog", "blog_index/blog-index.tsx"),
    route("/blog/$slug", "blog_post/blog-post.tsx"),
    // Every address nothing else answers: a 404 inside the shell, the same page `/rules` shows until it's published.
    route("$", "not_found/not-found.tsx"),
  ]),

  /*===== Account (customers and partners) =====*/
  route("/account", "layout_account/layout-account.tsx", [
    index("account_home/account-home.tsx"),
    route("/cart", "account_cart/account-cart.tsx"),
    route("/purchases", "account_purchases/account-purchases.tsx"),
    route("/profile", "account_profile/account-profile.tsx"),
    route("/dogs/$dogId", "account_dog_detail/account-dog-detail.tsx"),
    // One form for adding and editing; each route is a thin file over it.
    route("/dogs/new", "account_dog_form/account-dog-new.tsx"),
    route("/dogs/$dogId/edit", "account_dog_form/account-dog-edit.tsx"),
    // The partner's pages (F7), under the same shell; their guards let partners only.
    route("/partner", "account_partner/account-partner.tsx"),
    route("/partner/leads", "account_partner_leads/account-partner-leads.tsx"),
  ]),

  /*===== Admin =====*/
  route("/admin", "layout_admin/layout-admin.tsx", [
    // The Admin Dashboard (F11).
    index("admin_index/admin-index.tsx"),
    route("/evaluations", "admin_evaluations/admin-evaluations.tsx"),
    route("/enrollments", "admin_enrollments/admin-enrollments.tsx"),
    route("/payments", "admin_payments/admin-payments.tsx"),
    route("/dogs", "admin_dogs/admin-dogs.tsx"),
    route("/dogs/$dogId", "admin_dog_detail/admin-dog-detail.tsx"),
    route("/partners", "admin_partners/admin-partners.tsx"),
    route("/users", "admin_users/admin-users.tsx"),
    route("/courses", "admin_courses/admin-courses.tsx"),
    // One form for adding and editing; each route is a thin file over it.
    route("/courses/new", "admin_course_form/admin-course-new.tsx"),
    route("/courses/$slug/edit", "admin_course_form/admin-course-edit.tsx"),
    route("/settings", "admin_settings/admin-settings.tsx"),
    route("/sms", "admin_sms/admin-sms.tsx"),
    route("/blog", "admin_posts/admin-posts.tsx"),
    // One form for writing and editing a post; each route is a thin file over it.
    route("/blog/new", "admin_post_form/admin-post-new.tsx"),
    route("/blog/$id/edit", "admin_post_form/admin-post-edit.tsx"),
  ]),

  route("/auth", "auth/auth.tsx"),

  /*===== Server Routes =====*/
  route("/api/auth/$", "api_auth/api-auth.ts"),
  route("/rpc/$", "rpc/rpc.ts"),
  route("/api/evaluation-videos", "api_evaluation_videos/api-evaluation-videos.ts"),
  route("/api/evaluation-videos/$id", "api_evaluation_video/api-evaluation-video.ts"),
  // A partner application's paper (licence, permit, shopfront), for the Admin only: private, never under `/media`.
  route("/api/partner-documents/$id", "api_partner_document/api-partner-document.ts"),
  route("/payment/callback", "payment_callback/payment-callback.ts"),
  // The installable app (docs/mobile-app.md): its manifest and the page the service worker shows offline.
  route("/pwa/manifest.webmanifest", "pwa_manifest/pwa-manifest.ts"),
  route("/pwa/offline", "pwa_offline/pwa-offline.ts"),
  // For search engines and feed readers (F16): the public pages, what robots may read, the blog's feed.
  route("/sitemap.xml", "seo_files/sitemap.ts"),
  route("/robots.txt", "seo_files/robots.ts"),
  route("/blog/rss.xml", "seo_files/rss.ts"),
]);
