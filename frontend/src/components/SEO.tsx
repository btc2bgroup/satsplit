type SEOProps = {
  title: string;
  description: string;
  path: string;
};

export default function SEO({ title, description, path }: SEOProps) {
  const url = `https://satsplit.app${path}`;
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  );
}