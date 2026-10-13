#!/bin/sh
# The share card's fonts (Plan 98F): the game's display face and sans,
# subset to the characters a card can hold and written as woff2 beside the
# card, which embeds them (state/reportCard.ts's cardFontCss; ReportCardActions.tsx loads them), so its PNG
# renders the same on every machine. Re-run after a font package update.
# Needs fonttools and brotli: pip install fonttools brotli.
set -e
cd "$(dirname "$0")/.."
OUT=src/assets/card-fonts
FS=node_modules/@fontsource
# Printable ASCII, Latin-1's letters and signs, and the typographer's dashes,
# quotes, bullet, ellipsis and arrow.
CHARS="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2192"
SUB="--unicodes=$CHARS --flavor=woff2 --layout-features=kern,liga --no-hinting --desubroutinize --name-IDs=1,2"
# The display face is variable; the card sets it at one weight, 800.
fonttools varLib.instancer "$FS-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2" wght=800 -o /tmp/bricolage-800.ttf -q
pyftsubset /tmp/bricolage-800.ttf $SUB --output-file=$OUT/display-800.woff2
pyftsubset $FS/archivo/files/archivo-latin-400-normal.woff2 $SUB --output-file=$OUT/sans-400.woff2
pyftsubset $FS/archivo/files/archivo-latin-700-normal.woff2 $SUB --output-file=$OUT/sans-700.woff2
pyftsubset $FS/archivo/files/archivo-latin-400-italic.woff2 $SUB --output-file=$OUT/sans-400-italic.woff2
rm /tmp/bricolage-800.ttf
