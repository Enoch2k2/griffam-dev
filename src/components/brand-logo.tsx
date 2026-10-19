import Image from "next/image";
import Link from "next/link";

export function BrandLogo() {
  return (
    <div className="brand-logo">
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
    </div>
  );
}
