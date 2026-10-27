import Image from "next/image";
import Markdown from "react-markdown";

export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="article-body">
      <Markdown
        skipHtml
        allowedElements={["img", "p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "blockquote", "pre", "code", "a", "hr", "br"]}
        unwrapDisallowed
        components={{ img: ({ src, alt, title }) => {
          // Only bundled blog assets: no third-party tracking or arbitrary URLs.
          if (typeof src !== "string" || !/^\/images\/blog\/[a-z0-9-]+\.(svg|png|jpg|webp)$/.test(src)) return null;
          return <span className="article-image"><Image src={src} alt={alt || ""} width={1200} height={675} unoptimized />{title && <span className="article-caption">{title}</span>}</span>;
        }, h1: ({ children }) => <h2 className="article-heading-major">{children}</h2>, a: ({ href, children }) => <a href={href} rel="noopener noreferrer">{children}</a> }}
      >{body}</Markdown>
    </div>
  );
}
