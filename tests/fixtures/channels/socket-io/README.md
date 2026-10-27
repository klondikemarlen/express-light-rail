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

The example listens on port `3000` by default (`PORT` overrides it). Connect both users to the single `/updates` namespace with demonstration-only handshake auth `userId: "alice"` or `userId: "bob"`. `ChannelManager.authenticate` resolves the connection user, `ApplicationChannel` extends `BaseChannel` with the shared `isCurrentUser(userId)` check, and concrete `UpdatesChannel` owns the `records:updated` and `projects:updated` event subscriptions. Both subscriptions check resource ownership through the inherited helper; the project subscription also checks membership in the authenticated user's `projectIds`. Each handler projects its host-owned DTO and calls `broadcast(label, payload)`, which the package emits as a typed `packet` envelope. `POST /records` and `POST /projects` publish the corresponding host events. One namespace carries both resource kinds; the example uses Express and `node:http` as the host-owned HTTP server.
