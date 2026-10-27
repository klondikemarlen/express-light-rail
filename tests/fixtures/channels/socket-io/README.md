# Socket.IO consumer fixture

Run the installed-artifact check from the repository root with an absolute npm tarball path:

```sh
tests/fixtures/channels/socket-io/smoke.sh "$(pwd)/express-light-rail-<version>.tgz"
```

To run the plain Express and `node:http` example, install the package artifact into this fixture, then run:

```sh
npm install --no-save /absolute/path/to/express-light-rail-<version>.tgz
npm run example
```

The example listens on port `3000` by default (`PORT` overrides it). Connect both users to the single `/updates` namespace with demonstration-only handshake auth `userId: "alice"` or `userId: "bob"`. One host-owned `ApplicationChannel` publishes `packet` events labeled `record.updated` and `project.updated`. Its record policy checks record ownership; its project policy checks both project ownership and the user's permitted project IDs. `POST /records` and `POST /projects` publish the corresponding DTO packets. The example uses Express and `node:http` as the host-owned HTTP server.
