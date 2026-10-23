import Markdown from "react-markdown";

export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="article-body">
      <Markdown
        skipHtml
        allowedElements={["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "blockquote", "pre", "code", "a", "hr", "br"]}
        unwrapDisallowed
        components={{ a: ({ href, children }) => <a href={href} rel="noopener noreferrer">{children}</a> }}
      >{body}</Markdown>
    </div>
  );
}
