import { site } from "@starsagitarian/shared";
import "./character.css";

/**
 * The résumé portrait: the character's head and shoulders, cropped from the standing cut-out so
 * the face and cap match exactly. 160 and 320 pixel files cover sizes up to 160 CSS pixels.
 */
export function Avatar({ size = 112, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size }}>
      <picture>
        <source
          type="image/avif"
          srcSet="/art/avatar-160.avif 160w, /art/avatar-320.avif 320w"
          sizes={`${size}px`}
        />
        <img
          src="/art/avatar-320.webp"
          srcSet="/art/avatar-160.webp 160w, /art/avatar-320.webp 320w"
          sizes={`${size}px`}
          width={320}
          height={320}
          alt={`${site.name}, illustrated`}
          decoding="async"
        />
      </picture>
    </span>
  );
}
