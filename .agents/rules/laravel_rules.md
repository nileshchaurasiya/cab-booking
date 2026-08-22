# LARAVEL PROJECT — DEVELOPMENT RULES & BEST PRACTICES

You are working on an existing Laravel project.

Your priority is to:
1. Understand the existing code before changing it.
2. Preserve existing functionality.
3. Follow Laravel conventions.
4. Keep the code simple, maintainable, secure, and beginner-friendly.
5. Avoid unnecessary architecture or over-engineering.

==================================================
1. BEFORE MODIFYING ANY CODE
==================================================

Always inspect the relevant existing files before making changes.

Do not assume:
- Database structure
- Table names
- Column names
- Relationships
- Authentication method
- API response format
- Existing business logic
- Existing frontend expectations

Before changing code:
1. Find the relevant controller.
2. Find the relevant model.
3. Check migrations.
4. Check routes.
5. Check Form Requests if they exist.
6. Check related services/helpers if they exist.
7. Check frontend/API usage when relevant.

Never rewrite an entire file when a small change is enough.

Prefer minimal, targeted changes.

==================================================
2. DO NOT BREAK EXISTING FUNCTIONALITY
==================================================

When modifying existing functionality:

- Do not change API endpoints unless explicitly requested.
- Do not change HTTP methods unless explicitly requested.
- Do not change response JSON structure unless explicitly requested.
- Do not change database columns unless explicitly requested.
- Do not change authentication behavior unless explicitly requested.
- Do not remove existing validation.
- Do not remove existing relationships.
- Do not remove existing business rules.
- Do not remove working code just to make the code "cleaner".

If a change could break existing functionality, explain it before making the change.

==================================================
3. LARAVEL STRUCTURE
==================================================

Follow standard Laravel structure.

Use:

app/
├── Http/
│   ├── Controllers/
│   ├── Requests/
│   └── Resources/
├── Models/
├── Services/
├── Policies/
└── ...

Use:
- Controllers for HTTP request/response handling.
- Form Requests for complex validation.
- Models for database relationships and model-specific behavior.
- Services for complex business logic.
- API Resources for consistent API responses when appropriate.
- Policies for authorization.
- Jobs for background/queue work when appropriate.

Do not create Services, Repositories, Interfaces, Traits, or other abstractions unless they provide a real benefit.

Avoid over-engineering simple CRUD operations.

==================================================
4. CONTROLLERS
==================================================

Controllers should remain relatively small.

A controller should generally:

1. Receive the request.
2. Validate input.
3. Call business logic/service when necessary.
4. Return the response.

Avoid putting large business calculations directly inside controllers.

Bad:

Controller containing:
- fare calculation
- driver matching
- payment calculation
- commission calculation
- notification logic
- database transactions
- multiple unrelated operations

Move complex business logic into appropriate services.

==================================================
5. VALIDATION
==================================================

Always validate user input.

Prefer Form Request classes for complex validation.

Example:

php artisan make:request StoreBookingRequest

Use Laravel validation rules.

Do not trust:
- request data
- user IDs
- driver IDs
- prices
- commission values
- booking status
- payment amounts

Never allow the client/frontend to decide sensitive business values.

==================================================
6. MASS ASSIGNMENT
==================================================

Use $fillable or $guarded correctly.

Never blindly use:

Model::create($request->all());

Instead explicitly select validated fields.

Example:

$data = $request->validated();

User::create([
    'name' => $data['name'],
    'email' => $data['email'],
]);

==================================================
7. AUTHENTICATION
==================================================

Use Laravel's existing authentication system.

If Sanctum is used:
- Use auth:sanctum middleware.
- Use Bearer tokens correctly.
- Never store plaintext passwords.
- Always use Hash::make().
- Never return passwords in API responses.
- Revoke tokens during logout when appropriate.

Never manually implement password hashing.

Never expose:
- password
- password hash
- private tokens
- secrets
- API keys

==================================================
8. AUTHORIZATION
==================================================

Authentication and authorization are different.

Authentication:
"Who is the user?"

Authorization:
"Is this user allowed to perform this action?"

Use:
- Policies
- Gates
- Middleware
- Role checks

Do not rely only on frontend checks.

Example:

A customer must not be able to:
- modify another customer's booking
- modify driver information
- access admin APIs

A driver must not be able to:
- access admin functions
- modify another driver's ride
- change another driver's earnings

==================================================
9. ROLES
==================================================

For fixed roles such as:

customer
driver
admin

Do not repeatedly scatter these strings throughout the application.

Use constants or enums where appropriate.

Example:

User.php:

public const ROLE_CUSTOMER = 'customer';
public const ROLE_DRIVER = 'driver';
public const ROLE_ADMIN = 'admin';

Then use:

User::ROLE_DRIVER

instead of repeatedly using:

'driver'

Do not create constants for every string.

Database field names such as:

'name'
'email'
'phone'
'password'

do NOT need constants.

==================================================
10. CONSTANTS
==================================================

Use constants for repeated fixed business values.

Good candidates:

- roles
- booking statuses
- payment statuses
- driver statuses
- vehicle types
- fixed business states

Example:

Booking.php:

public const STATUS_PENDING = 'pending';
public const STATUS_ACCEPTED = 'accepted';
public const STATUS_STARTED = 'started';
public const STATUS_COMPLETED = 'completed';
public const STATUS_CANCELLED = 'cancelled';

Use:

Booking::STATUS_PENDING

instead of:

'pending'

Do not create constants unnecessarily.

==================================================
11. CONFIGURATION
==================================================

Use config files for application configuration.

Good examples:

- commission percentage
- default currency
- maximum booking distance
- application-specific limits
- third-party service configuration

Example:

config/cab.php

return [
    'commission_percentage' => 10,
];

Access using:

config('cab.commission_percentage')

Never hardcode sensitive configuration.

==================================================
12. ENVIRONMENT VARIABLES
==================================================

Use .env for environment-specific or secret values.

Examples:

DB credentials
API keys
secret keys
mail credentials
third-party credentials

Never commit secrets to Git.

Never put passwords or API keys directly in PHP source code.

Use:

env('SOME_VALUE')

ONLY inside configuration files when possible.

Application code should generally use:

config('some.key')

instead of directly calling env().

==================================================
13. INTENTIONALLY HARDCODED DEFAULTS
==================================================

Do NOT remove every hardcoded value.

Some defaults are intentionally hardcoded.

Example:

A development/testing default driver location may intentionally be:

latitude = 12.9716
longitude = 77.5946

If the developer explicitly says this is a testing/default value, leave it unchanged.

Do not change it to null or config automatically.

Always understand WHY a value is hardcoded before removing it.

==================================================
14. USER-FACING MESSAGES
==================================================

Do not scatter large numbers of user-facing messages throughout controllers.

For applications requiring multiple languages, use:

lang/en/

Example:

__('auth.invalid_credentials')

Keep technical/internal values separate from user-facing messages.

==================================================
15. DATABASE
==================================================

Use migrations for database structure.

Never manually modify production database structure without migrations.

Use:

php artisan make:migration

Follow Laravel migration conventions.

Always consider:
- foreign keys
- indexes
- unique constraints
- nullable fields
- cascade behavior
- timestamps

Do not create duplicate columns that represent the same data.

==================================================
16. DATABASE RELATIONSHIPS
==================================================

Define relationships in models.

Example:

User:

public function driverDetail()
{
    return $this->hasOne(DriverDetail::class);
}

Use Eloquent relationships instead of repeatedly writing manual joins when a relationship already exists.

Check existing relationships before creating new ones.

==================================================
17. EAGER LOADING
==================================================

Avoid N+1 query problems.

If related data is required, use:

with()

or:

load()

Example:

Booking::with(['customer', 'driver'])->get();

Do not repeatedly query related records inside loops.

==================================================
18. DATABASE TRANSACTIONS
==================================================

Use transactions when multiple database operations must succeed or fail together.

Example:

DB::transaction(function () {
    // create booking
    // create payment
    // update driver
});

If one important operation fails, the related changes should roll back.

==================================================
19. CAB BOOKING BUSINESS LOGIC
==================================================

For this cab-booking project, treat these as sensitive business values:

- fare
- distance
- driver earning
- admin commission
- payment amount
- booking status
- driver availability

Never trust these values from the frontend.

The backend must calculate/verify them.

Example:

Do NOT blindly accept:

{
    "price": 500
}

from the customer.

The backend should calculate the fare from trusted data.

==================================================
20. ADMIN COMMISSION
==================================================

If the business rule is:

90% → driver
10% → admin

Do not hardcode 10 in multiple places.

Use:

config('cab.commission_percentage')

or another appropriate centralized business configuration.

Calculate the commission on the backend.

Never allow the frontend to decide the admin commission.

Store appropriate transaction/payment records so the commission can be audited.

==================================================
21. MONEY / FARE
==================================================

Never use floating-point arithmetic carelessly for financial calculations.

Prefer integer smallest units when practical, or carefully use decimal database columns.

Example database:

decimal(10,2)

Do not trust frontend-calculated fare.

Always validate:
- distance
- fare
- commission
- driver earning
- payment amount

==================================================
22. BOOKING STATUS
==================================================

Booking status changes must be controlled by backend rules.

Example flow:

pending
→ accepted
→ started
→ completed

Possible cancellation:

pending
→ cancelled

Do not allow arbitrary status changes from the frontend.

Validate state transitions.

For example:

A completed ride should not become pending again.

==================================================
23. DRIVER AVAILABILITY
==================================================

Driver availability must be controlled by backend logic.

Examples:

available
busy
offline

Do not rely only on frontend/localStorage state.

When a driver accepts a ride, backend state should be updated.

When the ride completes, backend state should be updated.

==================================================
24. LOCATION DATA
==================================================

Driver location can be updated from the driver's device.

Validate:
- latitude range
- longitude range

Latitude:

-90 to 90

Longitude:

-180 to 180

Do not blindly trust location values.

==================================================
25. API RESPONSES
==================================================

Keep API responses consistent.

Success example:

{
    "message": "...",
    "data": {}
}

Error example:

{
    "message": "...",
    "errors": {}
}

Do not randomly change response structures.

If the frontend already depends on a response structure, preserve it unless explicitly asked to change it.

==================================================
26. HTTP STATUS CODES
==================================================

Use appropriate HTTP status codes.

200 → successful request
201 → resource created
204 → successful request with no content
400 → bad request
401 → unauthenticated
403 → authenticated but forbidden
404 → resource not found
422 → validation error
500 → server error

Do not return 200 for every situation.

==================================================
27. ERROR HANDLING
==================================================

Never hide important backend errors.

Use Laravel exception handling.

Do not expose sensitive stack traces in production.

Development:

APP_DEBUG=true

Production:

APP_DEBUG=false

Do not return database passwords, SQL credentials, tokens, or secrets in errors.

==================================================
28. LOGGING
==================================================

Use Laravel logging for important server-side problems.

Example:

Log::error('Booking payment failed', [
    'booking_id' => $booking->id,
]);

Do not log:
- passwords
- authentication tokens
- API secrets
- sensitive personal information unnecessarily

==================================================
29. API ROUTES
==================================================

Keep routes organized.

Use middleware appropriately.

Example:

Route::middleware('auth:sanctum')->group(function () {
    // protected routes
});

Do not duplicate authentication logic inside every controller.

==================================================
30. RESOURCE CONTROLLERS
==================================================

Use RESTful conventions where appropriate.

Example:

GET    /bookings
POST   /bookings
GET    /bookings/{booking}
PUT    /bookings/{booking}
DELETE /bookings/{booking}

But do not change existing routes simply to make them RESTful if the frontend already depends on them.

==================================================
31. SECURITY
==================================================

Always consider:

- SQL injection
- mass assignment
- broken authorization
- insecure direct object references
- password exposure
- token exposure
- validation bypass
- rate limiting
- CORS
- CSRF where applicable

Use Laravel's built-in security mechanisms whenever possible.

Never construct SQL using raw user input.

Prefer Eloquent or parameterized queries.

==================================================
32. FRONTEND VS BACKEND
==================================================

Never trust frontend calculations for important business logic.

Frontend:
- UI
- user interaction
- displaying data
- sending requests

Backend:
- authentication
- authorization
- fare calculation
- commission calculation
- driver earning
- payment verification
- booking state
- database updates

The frontend should never be considered trusted.

==================================================
33. DUPLICATE CODE
==================================================

If the same logic appears repeatedly, consider extracting it.

But do not create abstractions simply to make files shorter.

First determine whether the duplication is actually meaningful.

==================================================
34. NAMING
==================================================

Use clear Laravel/PHP naming conventions.

Classes:

AuthController
BookingController
DriverDetail

Methods:

register()
login()
logout()
calculateFare()

Variables:

$validatedData
$booking
$driver

Avoid unclear names:

$x
$data1
$temp
$abc

unless they are genuinely obvious in context.

==================================================
35. COMMENTS
==================================================

Write comments only when they explain WHY something is done.

Bad:

// Set status to active
$status = 'active';

Good:

// New drivers start unavailable until their device sends the first valid location.
$isAvailable = false;

Do not fill the code with unnecessary comments.

==================================================
36. TESTING
==================================================

Before considering a change complete:

1. Run relevant tests.
2. Check Laravel logs.
3. Test validation.
4. Test authentication.
5. Test authorization.
6. Test successful request.
7. Test failure cases.
8. Test database behavior.

When possible, use:

php artisan test

==================================================
37. LARAVEL ARTISAN
==================================================

Prefer Laravel Artisan commands for generating Laravel files.

Examples:

php artisan make:model
php artisan make:controller
php artisan make:request
php artisan make:migration
php artisan make:resource
php artisan make:policy
php artisan make:test

Do not manually create Laravel framework files when Artisan can generate them.

==================================================
38. CODE STYLE
==================================================

Follow PSR-12 and Laravel coding conventions.

Keep formatting consistent with the existing project.

Do not reformat unrelated files.

Do not change code style across the entire project unless explicitly requested.

==================================================
39. DEPENDENCIES
==================================================

Do not install a package unless necessary.

Before adding a package:
1. Check whether Laravel already provides the functionality.
2. Check existing dependencies.
3. Explain why the package is needed.
4. Consider maintenance/security implications.

Never add packages just because they are popular.

==================================================
40. GIT SAFETY
==================================================

Before major changes:

- Explain what files will change.
- Prefer small commits.
- Do not delete unrelated files.
- Do not modify .env secrets.
- Do not commit credentials.

Never run destructive Git commands unless explicitly requested.

Avoid:

git reset --hard
git clean -fd

unless explicitly authorized.

==================================================
41. DATABASE SAFETY
==================================================

Never delete production data.

Never run destructive database commands automatically.

Be careful with:

migrate:fresh
migrate:refresh
db:wipe

Only use them when explicitly requested and when it is clearly a development environment.

==================================================
42. DEBUGGING RULE
==================================================

When the user reports an error:

1. Identify the exact error.
2. Find the relevant file and line.
3. Explain the root cause in simple language.
4. Propose the smallest correct fix.
5. Implement the fix.
6. Test it.
7. Explain what was changed.

Do not randomly modify multiple files hoping the error disappears.

==================================================
43. 401 / 403 / 422 / 500
==================================================

When debugging API errors:

401:
Authentication/token problem.

403:
User is authenticated but not authorized.

422:
Validation problem.

500:
Backend/server exception.

Always inspect Laravel logs for 500 errors.

Do not "fix" a 500 error by hiding the exception.

==================================================
44. BEGINNER-FRIENDLY EXPLANATIONS
==================================================

The developer is learning Laravel.

Whenever making an important architectural change:

Explain:
- What it is.
- Why it is needed.
- Where it is used.
- What problem it solves.
- What would happen without it.

Use simple examples from this project.

Do not assume advanced Laravel knowledge.

==================================================
45. BEFORE IMPLEMENTATION
==================================================

For non-trivial changes:

First provide:

1. Current behavior.
2. Problem.
3. Proposed solution.
4. Files that will change.
5. Database changes, if any.
6. API changes, if any.
7. Risks.
8. Testing plan.

Then implement.

For small obvious bug fixes, implementation can proceed directly if the change is clearly safe.

==================================================
46. NEVER OVER-ENGINEER
==================================================

Do not automatically introduce:

- Repository pattern
- Service interfaces
- DTOs
- Event-driven architecture
- CQRS
- Microservices
- unnecessary traits
- unnecessary design patterns

Use the simplest Laravel solution that correctly solves the problem.

==================================================
47. FINAL CHECK BEFORE COMPLETING A TASK
==================================================

Before saying the task is complete, verify:

[ ] Existing functionality still works.
[ ] Validation works.
[ ] Authentication works.
[ ] Authorization works.
[ ] Database relationships work.
[ ] No passwords/tokens/secrets are exposed.
[ ] No unnecessary hardcoded business values were introduced.
[ ] Existing intentional defaults were preserved.
[ ] API response format was preserved.
[ ] No unrelated files were modified.
[ ] Relevant tests were run.
[ ] Laravel logs were checked if debugging.
[ ] Code follows Laravel conventions.

==================================================
48. MOST IMPORTANT RULE
==================================================

DO NOT CHANGE CODE JUST TO MAKE IT LOOK "BETTER".

Every change must have a reason.

Prefer:

simple + correct + secure + maintainable

over:

complex + abstract + over-engineered.
