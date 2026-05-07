#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SOURCE="$ROOT_DIR/apps/web/public/favicon.svg"
WEB_PUBLIC="$ROOT_DIR/apps/web/public"
STRIPE_APP="$ROOT_DIR/apps/stripe-app"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required: install the 'magick' command"
  exit 1
fi

render_square() {
  size="$1"
  output="$2"

  magick \
    -background '#202020' \
    -density 1024 \
    "$SOURCE" \
    -resize "${size}x${size}" \
    -gravity center \
    -extent "${size}x${size}" \
    -flatten \
    "$output"
}

render_square 16 "$WEB_PUBLIC/favicon-16x16.png"
render_square 32 "$WEB_PUBLIC/favicon-32x32.png"
render_square 180 "$WEB_PUBLIC/apple-touch-icon.png"
render_square 192 "$WEB_PUBLIC/android-chrome-192x192.png"
render_square 512 "$WEB_PUBLIC/android-chrome-512x512.png"
render_square 512 "$STRIPE_APP/riposte_icon_512.png"

magick "$WEB_PUBLIC/favicon-16x16.png" "$WEB_PUBLIC/favicon-32x32.png" "$WEB_PUBLIC/favicon.ico"

echo "Generated square icons from $SOURCE"
