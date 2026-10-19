import Image from "next/image";

export function OwnerPortrait() {
  return (
    <figure className="owner-portrait">
      <Image
        src="/images/enoch-griffith.jpg"
        alt="Enoch Griffith, the engineer behind GriffamDev"
        width={1536}
        height={2048}
        sizes="(max-width: 760px) 88vw, 360px"
      />
      <figcaption>
        <strong>Enoch Griffith</strong>
        <span>Full Stack Software Engineer</span>
      </figcaption>
    </figure>
  );
}
