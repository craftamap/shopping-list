import { useState } from "preact/hooks";
import { Fragment } from "preact";

function SearchResult({ result }) {
  return (
    <div class={"w-full border-b-2 py-2"}>
      <p>
        <a href={`/api/redirect/item/${result.document.itemId}`}>
          {result.document.text}
        </a>
      </p>
      <p class={"text-xs"}>{result.itemId}</p>
    </div>
  );
}

export default function SearchIsland() {
  const [searchResults, setSearchResults] = useState<
    { hits: { text: string; itemId: string }[] }
  >({ hits: [] });

  const search = async (e: InputEvent) => {
    const value = (e.target as HTMLInputElement).value;
    const params = new URLSearchParams({
      term: value,
    });
    const searchResponse = await fetch(`api/search?${params.toString()}`);
    const searchResult = await searchResponse.json();
    // TODO: debounce
    setSearchResults(searchResult);
  };

  return (
    <div>
      <input
        type={"text"}
        class={"w-full border-b-2 py-2"}
        onInput={search}
        placeholder="Search..."
      />
      {searchResults?.hits?.map((result) => {
        return <SearchResult result={result} />;
      })}
    </div>
  );
}
