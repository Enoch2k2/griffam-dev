"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function BrandLogo() {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="brand-logo" data-animation-hidden={hidden}>
      <Link href="/" aria-label="GriffamDev home" className="brand-logo-link">
        <Image
          className="brand-logo-image"
          src="/images/griffamdev-logo.gif"
          alt=""
          width={640}
          height={360}
          unoptimized
        />
        <span className="brand-logo-fallback">GriffamDev.</span>
      </Link>
      <button
        type="button"
        className="brand-animation-toggle"
        onClick={() => setHidden(!hidden)}
        aria-pressed={hidden}
      >
        {hidden ? "Show animated logo" : "Hide animated logo"}
      </button>
    </div>
  );
}
