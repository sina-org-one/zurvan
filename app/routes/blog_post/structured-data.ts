import { CENTER } from "~/lib/contact";
import { HEAD_TRAINER } from "~/lib/head-trainer";
import { absoluteAddress, absoluteUrl } from "~/lib/seo";
import { m } from "~/paraglide/messages";
import { getLocale } from "~/paraglide/runtime";

/*===== Structured Data =====*/
// The post's schema.org objects for search engines (app-spec F16): a `BlogPosting` and its breadcrumbs. Built in the
// route's `head()`, so every word is in the page's language and every address absolute in it.

/** What the head needs from the post; the loader returns exactly this. */
export type PostHeadData = {
  slug: string;
  title: string;
  excerpt: string;
  coverOg: string;
  coverAlt: string;
  publishedAt: Date;
  updatedAt: Date;
};

const LOGO_PATH = "/brand/k9-logo-256.webp";

/** The `BlogPosting`: the head trainer is the author (with the About page, where Zurvan lists its trainers), the center the publisher. */
export function blogPostingJsonLd(post: PostHeadData): Record<string, unknown> {
  const url = absoluteAddress({ path: `/blog/${post.slug}` });
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [absoluteUrl(post.coverOg)],
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    inLanguage: getLocale() === "fa" ? "fa-IR" : "en",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Person",
      name: HEAD_TRAINER.name,
      jobTitle: HEAD_TRAINER.role,
      url: absoluteAddress({ path: "/about" }),
    },
    publisher: {
      "@type": "Organization",
      name: CENTER.name,
      url: absoluteAddress({ path: "/" }),
      logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH), width: 256, height: 256 },
    },
  };
}

/** Home → blog → this post. */
export function breadcrumbJsonLd(post: PostHeadData): Record<string, unknown> {
  const items = [
    { name: CENTER.name, path: "/" },
    { name: m.blog_article_breadcrumb_blog(), path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteAddress({ path: item.path }),
    })),
  };
}
