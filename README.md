# express-light-rail (a.k.a. Express like Rails)

Some base models that will help your write an express app with some of the conceptual benefits of rails.

If you are asking yourself, "Should I be using Rails instead?", the answer is yes, you should be using Rails instead. This library is mearly a shim to reduce the pain of using a limited toolset in a limited environment.

## Development

1. Build the project with:
   ```bash
   npm run build
   ```

## Testing

1. Run the tests with:
   ```bash
   npm run test
   ```

## Deployment

1. Generate a new version via:

   ```bash
   npm version patch -m "some message"      # "patch" -> 1.0.0 -> 1.0.1
   npm version minor -m "some message"      # "minor" -> 1.0.0 -> 1.1.0
   npm version major -m "some message"      # "major" -> 1.0.0 -> 2.0.0
   ```

2. Deploy to npm with:
   ```bash
   npm publish
   ```
   Note that `publish` runs `npm run build` via `prepublishOnly` script.
