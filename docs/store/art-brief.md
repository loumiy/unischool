# UniSchool — The art brief

*What to commission from a human artist, and what each piece is for (Plan
117's O5). It replaces two things that stand in for now: the title screen's
painting, which is AI-generated and kept as a placeholder by the owner's
choice (23 October 2026), and the store's capsules, which F draws from the
game's own campus until the commission lands. Send it by 31 October and ask
for delivery by 1 December 2026, so the Steam page can go up on the
commissioned art.*

*Before it goes out:* the trademark search (O4) settles whether the name on
the capsules and the logo is "UniSchool".

---

## The game, for the artist

UniSchool is a calm management game. You found a small college and grow it
over fifty years into a university: you put up its buildings, write its
courses, hire its faculty, admit its students and field its teams. The
campus is the whole screen, an isometric map of brick, stone and lawn that
fills in year by year. The players' own words for it: growth, depth ("the
football manager of universities") and calm.

The art should promise that: a campus with history, warm and unhurried, at
its best on a clear day. It isn't a fantasy school or a cartoon, and there
are no characters to brand.

**References in the repository:**
- `docs/images/`: the game's own screenshots, and the timelapse of a
  campus growing.
- `docs/assets/`: every building in every one of the nine architectural
  styles, as the game draws it.
- `unischool/src/assets/campus-quad.webp`: the placeholder title painting.
  The commission replaces it. Its composition is a fair starting point
  (two halls framing a quad and a path, students walking, a clear sky);
  its execution is not.

**The look:**
- **Style:** the Georgian set, the one a new game starts in: red brick,
  white trim and cupolas, slate roofs, lawns and old trees. The capsules
  may show others (Collegiate Gothic is the most recognisable) if the
  artist wants a skyline.
- **Colours:** the school colours a new game starts with are maroon and
  gold (`FOUNDING_COLORS`, `unischool/src/data/schoolColors.ts`). The UI
  is cream, navy and maroon.
- **Type:** the game's face is Archivo (Google Fonts, open licence), in
  heavy weights for the name. The logo may use it or replace it.

## 1. The title art (replaces the placeholder)

The background of the title screen and the founding screen
(`.title-screen, .startup` in `unischool/src/styles.css`). It is shown full
bleed, scaled to cover the window and pinned at 62% of its height, on every
screen from a phone (390×844, portrait) to a 4K monitor (3840×2160).

- **Deliver:** 3840×2160 at least, as a lossless PNG or layered file. The
  game converts it to WebP.
- **Composition:**
  - The middle third is covered by the game's menu card (about 640 px wide
    on a desktop window). Put the subject at the sides: buildings left and
    right, a lawn or path running into the middle.
  - The top quarter carries the logo and the name in white. Keep it a
    calm, light sky with nothing busy behind them.
  - A phone crops to a narrow column from the middle, so the middle must
    still read as a campus on its own.
- **No text** in the picture. The game sets the name and the menus over it.

## 2. The store capsules (Steam)

Sizes as Steamworks lists them in October 2026. Check the current list on
Steamworks before the artist starts.

| Asset | Size | Notes |
|---|---|---|
| Header capsule | 920×430 | The name must be legible. |
| Small capsule | 462×174 | The name must be legible at this size. Keep the art simple. |
| Main capsule | 1232×706 | The front-page feature. |
| Vertical capsule | 748×896 | Seasonal sales. |
| Library capsule | 600×900 | The player's library grid. |
| Library hero | 3840×1240 | Behind the library page. No text or logo in it. |
| Library logo | 1280×720 | The logo alone, on a transparent PNG, laid over the hero. |

- The capsules carry the game's name and nothing else: no quotes, no
  awards, no "Wishlist now" (Steam's own rules).
- One picture can serve all of them if it is painted wide with room to
  crop. The title art (1) can be that picture.

## 3. The logo

A wordmark for "UniSchool", with or without a mark. It must:
- read in white on the title art, and in navy on cream (the game's menus);
- work at the small capsule's size;
- come as an SVG or a transparent PNG at 1280×720 or larger.

The game's present mark is the simple building icon beside the name on the
title screen (`unischool/src/components/Logo.tsx`). The logo may keep or
replace it.

## What happens when it lands

- The title art replaces `unischool/src/assets/campus-quad.webp`.
- The capsules go to `docs/store/steam/`, in place of F's fallback set.
- `docs/store/ai-disclosure.md` names the artist and drops the line about
  the generated title painting. The Credits name the artist too.
