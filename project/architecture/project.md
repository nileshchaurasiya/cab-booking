project/
├── index.html                  # Main landing page (redirects to customer/login.html)
├── documentation.md            # User manual & project details
├── planning.md                 # Project architecture & future roadmap
├── customer/                   # Customer Portal
│   ├── login.html
│   ├── login.js
│   ├── customer.html           # Main booking panel
│   └── customer.js
├── driver/                     # Driver Portal
│   ├── driver_login.html
│   ├── driver.html             # Driver active shift dashboard
│   └── driver.js
├── admin/                      # Admin Console
│   ├── admin_login.html
│   ├── admin.html              # Roster & bookings tracking
│   └── admin.js
├── assets/                     # Media & Static Assets
│   └── car.png
└── shared/                     # Shared database layers
    ├── mock-backend.js         # Unified client database layer
    └── db.json                 # Reset state config
