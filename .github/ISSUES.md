# Implementation Issues

## Issue 1: Add strong parameters helper for param filtering

**Status:** ✅ Implemented
**Labels:** enhancement, controller

### Description
Add Rails-style strong parameters for whitelisting request params.

### Motivation
Rails uses strong parameters to protect against mass assignment vulnerabilities:
```ruby
params.require(:user).permit(:name, :email)
```

### Proposed API
```typescript
class UsersController extends API {
  async create() {
    const userParams = this.params.require("user").permit(["name", "email"])
    const user = await User.create(userParams)
    return this.render({ user }, "created")
  }
}
```

### Acceptance Criteria
- [ ] params.require(key) throws if key missing
- [ ] permit([...keys]) returns only permitted keys
- [ ] Nested params support
- [ ] Tests covering basic usage

---

## Issue 2: Add skip_before_action and skip_after_action

**Status:** ✅ Implemented
**Labels:** enhancement, controller

### Description
Add ability to skip inherited filters in child controllers.

### Motivation
Rails controllers can skip inherited filters:
```ruby
class ApplicationController
  before_action :authenticate
end

class PublicController < ApplicationController
  skip_before_action :authenticate
end
```

### Proposed API
```typescript
class ApplicationController extends API {
  static beforeAction = [{ method: "authenticate" }]
}

class PublicController extends ApplicationController {
  static skipBeforeAction = ["authenticate"]
}
```

### Acceptance Criteria
- [ ] skipBeforeAction property to skip specific filters
- [ ] skipAfterAction property to skip specific filters
- [ ] Inherits parent filters but skips specified ones
- [ ] Tests covering inheritance and skipping

---

## Issue 3: Add rescue_from exception handling

**Status:** ✅ Implemented
**Labels:** enhancement, controller

### Description
Add declarative exception handling like Rails rescue_from.

### Motivation
Rails provides clean exception handling:
```ruby
class ApplicationController
  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found

  def record_not_found
    render json: { error: 'Not found' }, status: 404
  end
end
```

### Proposed API
```typescript
class ApplicationController extends API {
  static rescueFrom = [
    { error: NotFoundError, with: "handleNotFound" }
  ]

  handleNotFound(error: NotFoundError) {
    return this.render({ error: error.message }, "not_found")
  }
}
```

### Acceptance Criteria
- [ ] rescueFrom static property
- [ ] Catches specified error types
- [ ] Calls handler method
- [ ] Inherits from parent controllers
- [ ] Tests covering error handling
