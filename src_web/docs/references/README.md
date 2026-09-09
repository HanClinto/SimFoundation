# Source Reference Catalog

This is a development reference library, not unlocked player knowledge or runtime content. Source snapshots retain their own licenses; they are not covered by the repository's historical MIT license and must not enter the generic CC0 graphics package.

Each catalog entry records the canonical URL, author, license, page revision, retrieval date, local text path, capture scope, and transformation notes. Keep source text separate from interpretation. Revisions should create a new dated snapshot rather than silently replacing an older one. Use browser-rendered article text when the ordinary fetch tool cannot access a page. Do not archive navigation, advertising, user credentials, or unrelated discussions.

The JSON catalog is the machine-readable index. Adaptation notes should distinguish source-supported facts, explicit game abstractions, and unresolved questions. Archiving an article never unlocks its contents for the player.

Run `node scripts/archive-scp-recommendations.mjs` from `src_web` to refresh every SCP Wiki article linked in Abby's recommendation list. Pass one or more page slugs, such as `scp-049`, to refresh only those entries. The archiver uses a browser user agent because Wikidot rejects some generic HTTP clients. It writes searchable text, standalone HTML, and local copies of article images and media; unavailable media remain absolute source links and are reported during the run.

Run `npm run archive:scp:historical` to refresh the pinned Internet Archive snapshots of deleted SCP-001-O5 and SCP-963. These copies are cataloged as historical snapshots with their original canonical URLs and capture timestamps; they do not replace the current SCP Wiki removal notice.
