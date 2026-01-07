# Add Rails-inspired controller features to Express Light Rail

## Summary

This PR adds several Rails-inspired controller features to make Express controllers more powerful and Rails-like. All features are fully tested (38 tests passing) and include working examples.

## Features Implemented

### 1. HTTP Status Code Symbols ✨
- 60+ status code constants with Rails-style naming (`ok`, `created`, `not_found`, `unprocessable_entity`, etc.)
- Type-safe with TypeScript
- Helper function `toStatusCode()` to convert symbols to numbers

**Example:**
```typescript
return this.render({ user }, 'created')  // 201
return this.render({ error: 'Not found' }, 'not_found')  // 404
```

### 2. Response Helper Methods ✨
- **`render(data, status)`** - JSON responses with symbolic status codes
- **`head(status)`** - Empty responses with status codes
- **`redirect(path, status)`** - Redirects with status codes

**Example:**
```typescript
return this.render({ user }, 'created')  // JSON response with 201
return this.head('no_content')  // Empty 204 response
return this.redirect('/login', 'see_other')  // 303 redirect
```

### 3. Before/After Action Filters ✨
- `beforeAction` and `afterAction` static properties
- Support for `only` and `except` options to limit which actions filters run on
- Async filter support
- Automatic error handling - filters can halt execution by throwing

**Example:**
```typescript
class UsersController extends API {
  static beforeAction = [
    { method: "loadUser", only: ["show", "update", "destroy"] }
  ]

  private async loadUser() {
    this.user = await User.findByPk(this.params.userId)
  }
}
```

### 4. Skip Filters ✨
- `skipBeforeAction` and `skipAfterAction` properties
- Allows child controllers to skip inherited filters
- Properly walks prototype chain to collect and filter actions

**Example:**
```typescript
class ApplicationController extends API {
  static beforeAction = [{ method: "authenticate" }]
}

class PublicController extends ApplicationController {
  static skipBeforeAction = ["authenticate"]  // Skip parent's auth
}
```

### 5. Rescue From Exception Handling ✨
- Declarative exception handling like Rails `rescue_from`
- Static `rescueFrom` property with error class and handler method
- Inherits rescue handlers from parent controllers
- Falls back to default error handling if no match

**Example:**
```typescript
class ApplicationController extends API {
  static rescueFrom = [
    { error: RecordNotFoundError, with: "handleNotFound" }
  ]

  protected handleNotFound(error: RecordNotFoundError) {
    return this.render({ error: error.message }, "not_found")
  }
}
```

### 6. Strong Parameters ✨
- Rails-style parameter filtering with `require().permit()`
- Protects against mass assignment vulnerabilities
- `require(key)` throws BaseApiError if parameter missing
- `permit(keys)` returns only whitelisted attributes
- Accessible via `this.strongParams` getter

**Example:**
```typescript
async create() {
  // Only allow specific fields, filter out everything else
  const userParams = this.strongParams
    .require("user")
    .permit(["email", "firstName", "lastName"])

  const user = await User.create(userParams)
  return this.render({ user }, "created")
}
```

## Complete Example

Here's a full controller using all the new features:

```typescript
class ApplicationController extends API {
  // Global exception handling
  static rescueFrom = [
    { error: RecordNotFoundError, with: "handleNotFound" }
  ]

  protected handleNotFound(error: RecordNotFoundError) {
    return this.render({ error: error.message }, "not_found")
  }
}

class UsersController extends ApplicationController<User> {
  // Before action filters
  static beforeAction = [
    { method: "loadUser", only: ["show", "update", "destroy"] }
  ]

  private user?: User | null

  async index() {
    const users = await User.findAll()
    return this.render({ users })  // Implicit 'ok' status
  }

  async show() {
    if (!this.user) {
      return this.render({ error: "User not found" }, "not_found")
    }
    return this.render({ user: this.user })
  }

  async create() {
    // Strong parameters for security
    const userParams = this.strongParams
      .require("user")
      .permit(["email", "firstName", "lastName"])

    const user = await User.create(userParams)
    return this.render({ user }, "created")  // 201
  }

  async destroy() {
    if (!this.user) {
      throw new RecordNotFoundError("User not found")  // Caught by rescue_from
    }
    await this.user.destroy()
    return this.head("no_content")  // 204
  }

  // Filter method
  private async loadUser() {
    this.user = await User.findByPk(this.params.userId)
  }
}
```

## Test Coverage

- **38 tests total, all passing** ✅
- Comprehensive test coverage for all new features:
  - Response helpers (render, head, redirect) - 6 tests
  - Action filters (before/after) - 6 tests
  - Skip filters with inheritance - 3 tests
  - Rescue from exception handling - 4 tests
  - Strong parameters - 3 tests
- Tests cover edge cases, error handling, and inheritance
- All tests use realistic scenarios

## File Changes

### New Files
- `src/base-controller/http-status-codes.ts` - Status code constants
- `src/base-controller/strong-parameters.ts` - Strong parameters class
- `.github/ISSUES.md` - Implementation documentation

### Modified Files
- `src/base-controller/api.ts` - Added all new features
- `src/base-controller/index.ts` - Export new types and classes
- `example-app/controllers/application-controller.ts` - Demonstrate rescue_from
- `example-app/controllers/users-controller.ts` - Demonstrate all features
- `tests/base-controller/api.test.ts` - Comprehensive test suite

## Breaking Changes

**None** - all features are additive and backwards compatible.

Existing code continues to work without modification. The new features are opt-in:
- Response helpers are `protected` methods, won't interfere with existing code
- Filters and rescue_from are empty by default
- Strong parameters are accessed via new `strongParams` getter

## Migration Guide

No migration needed! To adopt the new features:

1. **Start using symbolic status codes:**
   ```typescript
   // Before
   return this.response.status(201).json({ user })

   // After
   return this.render({ user }, 'created')
   ```

2. **Add before/after filters:**
   ```typescript
   static beforeAction = [
     { method: "authenticate", except: ["index"] }
   ]
   ```

3. **Add exception handling:**
   ```typescript
   static rescueFrom = [
     { error: MyError, with: "handleMyError" }
   ]
   ```

4. **Use strong parameters:**
   ```typescript
   const params = this.strongParams.require("user").permit(["name", "email"])
   ```

## Documentation

- JSDoc comments on all public methods
- Implementation issues in `.github/ISSUES.md`
- Working examples in `example-app/controllers/`
- Comprehensive test suite serves as documentation

## Related Issues

All three implementation issues have been completed:
- ✅ Issue 1: Add strong parameters helper for param filtering
- ✅ Issue 2: Add skip_before_action and skip_after_action
- ✅ Issue 3: Add rescue_from exception handling

(Issues documented in `.github/ISSUES.md`)

## Commits

1. **✨ Add Rails-style controller features**
   - HTTP status code symbols (60+ constants)
   - Response helpers (render, head, redirect)
   - Before/after action filters with only/except
   - 18 comprehensive tests

2. **✨ Add advanced Rails controller features**
   - Skip filters (skipBeforeAction/skipAfterAction)
   - Rescue from exception handling
   - Strong parameters with require/permit
   - 10 additional tests
   - Updated example app

## Performance Impact

Minimal performance impact:
- Filter collection walks prototype chain once per action handler creation (startup time)
- Response helpers are thin wrappers around Express methods
- Strong parameters use lodash `pick` (already a dependency)
- All features are opt-in and only active when used

## Future Enhancements

Potential additions for future PRs:
- Nested strong parameters support
- `prepend_before_action` / `append_before_action`
- `around_action` filters
- Flash message support between requests
- More advanced parameter transformations

---

**Ready to merge!** All tests pass, no breaking changes, fully documented with working examples.
