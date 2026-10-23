# Browser-safe API contracts

`express-light-rail/contracts` is the browser-safe entrypoint for the deliberately small query and policy shapes shared by Travel, ELCC, and TK. It exports `ModelOrder`, `WhereOptions`, `FiltersOptions`, `QueryOptions`, `PaginationQuery`, `Pagination`, and the four-action `Policy`; its runtime exports are `DEFAULT_PER_PAGE`, `MAX_PER_PAGE`, and `MAX_PER_PAGE_EQUIVALENT`. It has no Express, Sequelize, Winston, Vue, React, or application-startup dependency. Import it directly; do not reach these definitions through the package root.

The `ModelOrder` contract preserves two-to-six-string tuples (one to five path segments followed by direction). The backend `ModelOrder` remains the intersection of that tuple contract with Sequelize's `Order`. Shared pagination defaults and caps have one owner in this module and are re-exported by the existing backend helpers. `Pagination` is the numeric `{ page, perPage, limit, offset }` response shape; requests use `PaginationQuery` or the pagination fields on `QueryOptions`.

`WhereOptions<Model, Attributes>` provides model-keyed value-or-array filters; `FiltersOptions` and `QueryOptions` are generic extension points for host-owned filters. The four booleans in `Policy` describe only the common show/create/update/destroy actions. Extend these types locally for model fields, additional actions, endpoint envelopes, filters, and project-specific differences. Do not use this type contract as authorization, unrestricted query validation, or a replacement for the server policy scope: client filters only narrow the policy-authorized result set.

## Consumer fixture evidence

`tests/fixtures/browser-contracts/travel` and `tests/fixtures/browser-contracts/elcc-tk` contain disposable before/after declaration examples, type checks (including intentional negative cases), and a browser bundle entry. They are not application migrations, package tests, or evidence of a published artifact. Keep their host wire contracts unchanged. Once a packed package has been produced, installed, and the checks below pass in both fixture roots, consumers can remove only the duplicated generic declarations represented by the corresponding `before.ts`; retain their domain-specific additions and API clients.

Build and pack from the repository, then run these commands inside **each** fixture directory, substituting the candidate or exact released artifact:

```sh
npm install --no-save --package-lock=false /absolute/path/to/express-light-rail-<version>.tgz
npx tsc --noEmit -p tsconfig.json
npx esbuild src/browser-smoke.ts --bundle --platform=browser --format=esm --metafile=browser-meta.json --outfile=dist/browser-smoke.js
```

The fixture manifests install TypeScript 5.7.3 and esbuild 0.25. Inspect every input/import in `browser-meta.json` and the emitted bundle: only the fixture entry and the package's contracts entry should appear, with no backend modules or external runtime imports. Inspect the installed `dist/contracts/index.d.ts` as well. Type-checking consumes negative cases for unknown model fields, wrong values, extra policy actions and unsupported order tuples.

For corresponding backend behavior, run `npm test -- --run tests/base-controller/api-helpers/build-order.test.ts tests/base-controller/api-helpers/build-pagination.test.ts tests/base-controller/api-helpers/determine-limit.test.ts`. Client filters still require server validation and must only narrow a policy-authorized query.

## Published boundary

The `./contracts` export targets independent ESM, CommonJS and declaration files under `dist/contracts/`. It does not resolve through the package root. Both backend and browser entrypoints reuse the same constants; no browser or tooling dependency is added to package runtime imports.

Use a released version whose Node, TypeScript, module-resolution, and package export requirements are satisfied by the host. Confirm the actual resolved versions in each application before adoption; this source change does not claim support for any specific installed application version. MSSRT provides authoring/review guidance, while this subpath is executable type/constant contracts only. Host projects own endpoint envelopes, authorization, query validation, route/client behavior, and application migration/review.