# Source Layout

`src/` contains the shared framework primitives that host Express applications install.

The package is intentionally not a full application framework. Host apps keep their `express.Router`, middleware stack, models, serializers, queue workers, and deployment shape. This package supplies Rails-like seams that make those host-owned pieces consistent.

## Request path

```text
Express route -> API controller -> Policy -> Service -> Model -> Serializer -> Response
```

## Package areas

- `base-controller/` - controller action dispatch, structured API errors, and request query helpers.
- `base-policy/` - Pundit-like policies, policy scopes, and permitted attributes.
- `base-service/` - service object call pattern for business operations.
- `base-serializer/` - response shaping with explicit preload checks.
- `base-job/` - ActiveJob-like job entry points with host-owned queue persistence.
- `jobs/` - explicit job registration and opt-in BullMQ queue processing; hosts own outbox schema, relay, and process lifecycle.
- `channels/` - guarded process-local pub/sub and opt-in Socket.IO delivery through a shared host `ApplicationChannel` and concrete resource subscriptions; hosts own authentication, policies, packet catalogs, DTOs, and HTTP startup.
- `model-helpers/` - typed Sequelize scopes and fresh-instance scoped primary-key lookups.
- `utils/` - small shared utilities that support the primitives.

## Design rule

Prefer Express syntax at the boundary and Rails conventions inside the class being called.

```ts
router.route("/api/users").get(UsersController.index).post(UsersController.create)
```

The route stays familiar to Express users. The controller action behaves like a Rails action.
