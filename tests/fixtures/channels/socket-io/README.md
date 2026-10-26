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

The example listens on port `3000` by default (`PORT` overrides it). Connect to the `/records` namespace with handshake auth `userId: "alice"` or `userId: "bob"`. `POST /records` publishes a record update, and the host-owned policy sends it only to the record owner.
