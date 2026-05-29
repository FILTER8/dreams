import Link from "next/link";

export function TokenImage({
  tokenId,
  image,
  animated = false,
  href,
  framed = true,
}: {
  tokenId: string;
  image?: string;
  animated?: boolean;
  href?: string;
  framed?: boolean;
}) {
  const body = (
    <div className={`aspect-square overflow-hidden bg-black ${framed ? "border border-[#111]" : ""}`}>
      {image ? (
        <img
          src={image}
          alt={`Chain Dreams #${tokenId}`}
          className={`h-full w-full object-contain ${animated ? "cd-art-animated" : "cd-art-static"}`}
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.22em] opacity-40">
          NO SIGNAL
        </div>
      )}
    </div>
  );

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}
