# The AI disclosure — a draft

**Status:** a draft for the owner to edit (Plan 95Z, the second review's
B6-3). Nothing here is published. The wording follows the review's §7
([`6-marketability.md`](../reviews/2026-10-game-review-ii/6-marketability.md)):
say plainly what was generated, what a person directed and chose, and what
will be made by hand. A vague disclosure is read as the worst case.

## The owner's decision on the Credits (7 October 2026)

For the itch.io playtest (Plan 97, PR C), the game is credited to
**Halifax Games**, a pseudonym for now, and the Credits no longer name
the assistant. In its place, a footnote on *Halifax Games*, at the foot
of the Credits card:

> \* Made with the help of AI tools.

This is the owner's choice for the game itself. It is shorter than the
rule below ("don't hide the assistant behind 'tools'") asks of store
copy, so the store forms stay specific: itch.io's and Steam's answers
below still say part by part what was made with the assistant. The
README's *How UniSchool is made* paragraph is unchanged.

## The facts it rests on

Checked on `main` on 6 October 2026; the pictures brought up to date on
2 November 2026, when the title painting left the build.

- **How the game is made.** The owner writes the brief for every plan in
  [`docs/plans/`](../plans/README.md) — what to build, what to change, what
  to leave alone — answers every review's questions, and picks between the
  mockups and options each plan puts to them. Many plans start from the
  owner's own playthrough notes. Claude Code, an AI coding assistant, writes
  the code, the player-facing text and the plans' records from those briefs.
  The in-game Credits say it in a footnote: "Made with the help of AI
  tools" (`unischool/src/components/Credits.tsx`, above).
- **What that produced.**
  - All of the game's code.
  - All of the player-facing text: letters, events, course descriptions,
    faculty careers and quirks, the specialization cards, the Final Report,
    the help.
  - The campus art. Every building, tree, path and season on the map, and
    every faculty portrait, is drawn by the game's own code from shapes and
    numbers (`unischool/src/components/`, `FacultyPortrait.tsx`). That code
    was written with the assistant. So is the title screen: since 0.2.0
    it shows the game's own campus, turning slowly, where an AI-generated
    painting stood in before (`unischool/src/assets/campus-quad.webp`,
    removed from the build). One picture outside the game is generated:
    the itch.io page's cover, a stand-in to be replaced.
  - The music and sound, synthesized live by the game's code through the
    Web Audio API (`unischool/src/components/audio/`), except the title
    screen's theme, which is composed and recorded by a human composer
    (`unischool/src/assets/title-theme.mp3`). No generated audio, and no
    voices.
  - The store text and the trailer's captions, written with the same
    assistant.
- **What is not generated.** No picture in the build. The typefaces (Archivo, Bricolage Grotesque,
  Azeret Mono) are open fonts by their designers. The share image
  (`unischool/public/og-image.jpg`) is a screenshot of the game.
- **Nothing is generated while you play.** The game's only network call is
  the anonymous play statistics (Plan 97E), sent to PostHog only in a
  production build and only once the player allows it; they carry numbers
  and fixed values, nothing generated and nothing typed
  ([`analytics.md`](../architecture/analytics.md)). Otherwise the game makes
  no network calls: a search of `unischool/src` finds one `fetch`, the
  statistics' (`unischool/src/analytics/analytics.ts`), no `XMLHttpRequest`,
  no `WebSocket`, no `sendBeacon` and no AI service, and its only runtime
  dependencies are React and three font packages (`unischool/package.json`).
  Everything it shows is in the build. Saves stay in the browser.
- **No human edit of the text yet.** The review asks for one on the
  most-read text (the founding letters, the summer, the specialization
  letter, the Final Report); it is the owner's, in the backlog. Until it
  is done, the disclosure does not say the text was "edited by the
  developer".
- **Nothing is commissioned yet.** The capsule art and the logo are to be
  commissioned from an artist before the Steam page goes up (review §5,
  [`art-brief.md`](art-brief.md)). When they are, they are named here and
  in the Credits. The title screen needs no art now: the generated
  painting the owner kept as a placeholder (Plan 117 §2) gave way to the
  game's own campus in 0.2.0.

## For Steam's content survey

Steam asks about two kinds of AI content: content made before release, and
content generated while the game runs. Code assistants are exempt, but
player-facing content made with one, text included, is to be disclosed.

**Pre-generated content** (shown on the store page):

**Ready to paste with 0.2.0.** Plan 117A held it back while the build
shipped the AI-generated title painting, which made the second paragraph's
"no picture in the game comes from an image generator" false. 0.2.0 is
the first build without it, so paste it once the store's build is 0.2.0
or later. The AI-generated itch.io cover never goes on Steam.

> UniSchool is designed and directed by one developer and built with an AI
> coding assistant, plan by plan. The developer wrote the brief for every
> feature, chose between the designs it produced, and played the game
> between each step to decide the next.
>
> The game's text — letters, events, course descriptions, faculty careers
> and the Final Report — was written with that assistant under the
> developer's direction. The campus, the buildings and the faculty portraits
> are drawn by the game's own code, which was also written with it: no
> picture in the game comes from an image generator. The title theme is by a
> human composer; the rest of the music and sound is synthesized by the
> game's code. There are no voices.
>
> The store's capsule art and the logo are made by a human artist.

Two sentences wait on the owner:
- the last one goes in only once the capsule art and logo are commissioned.
  Until then, leave it out rather than promise it;
- "and edited by the developer" joins the second paragraph's first sentence
  only once the human edit is done.

**Live-generated content:**

> None. The game generates no AI content while you play. Its only network
> call is anonymous play statistics, sent only if the player allows it.

## For itch.io

itch.io asks whether generative AI was used, and in which parts. The honest
answers:

| Part | Answer | Why |
|---|---|---|
| Text and dialogue | **Yes** | Every player-facing word was written with the assistant. |
| Code | **Yes** | All of it. |
| Graphics | **Yes, the page's cover only** | The game draws every picture with code written with the assistant; none is generated. The page's cover image is an AI-generated stand-in, to be replaced. Once it is (by [`itch/cover.jpg`](itch/cover.jpg), the game's own render, or commissioned art), the answer is **No**. |
| Sound and music | **No**, if the form means generated audio | The title theme is by a human composer; the rest is synthesized live by code, and the same note covers it. |

The page's description carries the same text as Steam's pre-generated
section, unchanged, so the two stores never say different things.

## The short form

For the README, the game's own site and a press kit:

> **How UniSchool is made.** One developer designs and directs it; an AI
> coding assistant (Claude Code) writes the code and the text from the
> developer's briefs, plan by plan, and the developer chooses between the
> designs and plays the game between plans. The campus and the portraits are drawn by
> that code, and the music is synthesized by it, but for a title theme by a
> human composer. No image in the game, and no sound or voice, comes from
> a generator, and nothing is generated while you play. The one generated
> picture is the itch.io page's cover, a stand-in to be replaced.

## What to keep out of any copy

- Never put "AI" beside "school simulator" in a title, tag or line of copy.
  Another game on Steam is that pairing (review §2).
- Don't call the art "hand-made". It is drawn by code, and the code was
  generated.
- Don't hide the assistant behind "tools". Name what was made with it.
