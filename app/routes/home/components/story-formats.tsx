import { formats } from "~/routes/home/content";
import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Formats: Where we train =====*/
// Each format gets a small storybook scene of the place itself, which says more than an icon would.
const FORMAT_SCENES = ["home", "center", "lodge"] as const;
// The service area is the business card's «تمام نقاط تهران» (`CENTER.serviceArea`). The scene's sides are logical, so
// the English pages (left to right) get its mirror image: the ears and the bubble stay over the heading's side.
export function StoryFormats() {
  return (
    <section aria-labelledby="st-formats-title" className="relative bg-inverse pt-32 pb-14 md:pt-40 md:pb-16">
      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        {/*------ Behind the panel's top edge: hedges, the ears and the bubble ------*/}
        {/* The hedges' flat bottoms tuck under the edge, so they grow out from behind it like the dog does. */}
        <div aria-hidden className="absolute inset-x-4 top-0 md:inset-x-8">
          <MascotCut
            name="hedge"
            className="lively-sway absolute start-[-2%] bottom-[calc(100%-0.6rem)] w-36 md:w-52"
          />
          <MascotCut
            name="hedge"
            className="lively-sway-2 absolute end-[-2%] bottom-[calc(100%-0.6rem)] w-44 -scale-x-100 md:w-80"
          />
          <MascotCut
            name="ears"
            className="lively-twitch absolute start-[12%] bottom-[calc(100%-0.5rem)] w-28 md:start-[22%] md:w-40"
          />
        </div>
        <div className="absolute inset-x-4 top-0 md:inset-x-8">
          <ChalkBubble
            tail="start"
            className="lively-float-2 absolute start-[calc(12%+7.5rem)] bottom-[calc(100%+1.4rem)] md:start-[calc(22%+10.5rem)] md:w-44"
          >
            {m.home_formats_bubble()}
          </ChalkBubble>
        </div>

        <div className="relative z-10 rounded-[2rem] border-2 border-foreground/70 bg-muted p-4 sm:p-5 md:p-8 lg:grid lg:grid-cols-[1.25fr_3fr] lg:gap-8">
          <div className="mb-6 lg:mb-0 lg:self-center">
            <h2
              id="st-formats-title"
              className={`${DISPLAY_HEADING} lively-reveal text-4xl md:text-5xl lg:text-[2.6rem]`}
            >
              {m.home_formats_title_one()}
              <br />
              {m.home_formats_title_two()}
            </h2>
            <p className="mt-4 max-w-xs text-lg leading-8 text-foreground/80">{m.home_formats_line()}</p>
          </div>

          {/* On phones each place is a row, its scene beside the words, so the three fit on about one screen
              instead of three tall cards. */}
          <ul className="lively-reveal grid gap-3 sm:grid-cols-3 sm:gap-4">
            {formats().map((format, index) => (
              <li
                key={format.title}
                className="lively-lift grid grid-cols-[1fr_8.5rem] items-center gap-x-3 overflow-hidden rounded-2xl border border-foreground/25 bg-card py-4 ps-4 pe-1 sm:flex sm:flex-col sm:items-stretch sm:px-5 sm:pt-5 sm:pb-0"
              >
                <div>
                  <h3 className="font-display text-base leading-snug font-bold text-foreground sm:text-lg">
                    {format.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-foreground/75">{format.detail}</p>
                </div>
                <MascotCut
                  name={FORMAT_SCENES[index]}
                  className="lively-lift-pic w-full sm:-mx-3 sm:mt-auto sm:w-[calc(100%+1.5rem)] sm:max-w-72 sm:self-center sm:pt-4"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
