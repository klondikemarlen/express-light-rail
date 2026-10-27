# External adoption fixtures

`travel/` and `elcc/` are isolated consumer-shaped cutovers. Install dependencies and an exact package tarball before running their TypeScript checks and behavioral suites:

The Travel fixture uses a host `ApplicationController` to expose its existing `currentUser` and
passes the inherited request signal to a cooperative service without installing host signal
middleware. Its route behavior verifies that this default signal is available to the service.

```sh
npm run build
npm pack
tests/fixtures/adoption/smoke.sh "$(pwd)/express-light-rail-<version>.tgz"
```

The script checks both ESM and CommonJS entrypoints from each installed fixture. See [`docs/adoption.md`](../../../docs/adoption.md) for compatibility evidence, expected behavior, and the release/install evidence boundary.
