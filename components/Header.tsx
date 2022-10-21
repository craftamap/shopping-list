import { Fragment } from "preact";
import { Head } from "https://deno.land/x/fresh@1.0.1/runtime.ts";

export default function Header(
  { title, backlinkUrl, showSearch }: {
    title: string;
    backlinkUrl?: string;
    showSearch?: boolean;
  },
) {
  let backlink;
  if (backlinkUrl) {
    backlink = <a href={backlinkUrl} class="pr-1">&lt;</a>;
  }

  return (
    <Fragment>
      <Head>
        <title>{title}</title>
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <header class="py-4 px-2 shadow-lg">
        <div class="max-w-screen-md mx-auto flex justify-between">
          <h1 class="text-xl font-bold">{backlink}{title}</h1>
          {showSearch && <a href="/search">🔍</a>}
        </div>
      </header>
    </Fragment>
  );
}
