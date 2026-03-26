# Restaurant Ordering System — Backend

A real-time restaurant ordering API built with NestJS, Prisma, PostgreSQL, and Socket.IO.

## Tech Stack

- **Framework**: NestJS (Node.js)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (Passport)
- **Real-time**: Socket.IO
- **Validation**: class-validator + class-transformer

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/darky99/restaurant-backend.git
   cd restaurant-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start PostgreSQL (if not already running):
   ```bash
   docker run -d --name restaurant-postgres \
     -e POSTGRES_PASSWORD=postgres123 \
     -p 5432:5432 \
     postgres:15-alpine
   ```

4. Create the database:
   ```bash
   docker exec restaurant-postgres psql -U postgres -c "CREATE DATABASE restaurant_db;"
   ```

5. Create `.env` from the example:
   ```bash
   cp .env.example .env
   ```
   The default `DATABASE_URL` is `postgresql://postgres:postgres123@localhost:5432/restaurant_db`. Update it if your PostgreSQL setup differs.

6. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

7. Seed the database:
   ```bash
   npx prisma db seed
   ```

8. Start the development server:
   ```bash
   npm run start:dev
   ```

The API runs at `http://localhost:3001/api`.

### Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@restaurant.com | admin123 |
| Customer | john@example.com | customer123 |

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Get current user | Yes |

### Menu
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/menu | List menu items (supports search, category, dietary, price filters) | No |
| GET | /api/menu/categories | List categories | No |
| GET | /api/menu/:id | Get menu item detail | No |
| POST | /api/menu | Create menu item | Admin |
| PATCH | /api/menu/:id | Update menu item | Admin |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/cart | Get user's cart | Yes |
| POST | /api/cart/items | Add item to cart | Yes |
| PATCH | /api/cart/items/:id | Update cart item | Yes |
| DELETE | /api/cart/items/:id | Remove cart item | Yes |
| DELETE | /api/cart | Clear cart | Yes |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/orders | Place order from cart | Yes |
| GET | /api/orders | List orders | Yes |
| GET | /api/orders/:id | Get order detail | Yes |
| PATCH | /api/orders/:id/status | Update order status | Admin |

### Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/payments | Process payment | Yes |
| GET | /api/payments/:orderId | Get payment status | Yes |

## WebSocket Events

Namespace: `/orders`

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| order:subscribe | orderId (string) | Join order tracking room |
| kitchen:subscribe | — | Join kitchen feed room |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| order:status_updated | { orderId, status, order } | Order status changed |
| order:new | { order } | New order placed (kitchen) |

## Architecture

```
src/
  auth/           # Authentication (JWT, guards, decorators)
  menu/           # Menu management (CRUD, search, filters)
  cart/           # Shopping cart (add, update, remove)
  order/          # Order management (placement, status transitions)
  payment/        # Mock payment processing
  websocket/      # Socket.IO gateway for real-time events
  prisma/         # Database client and module
  common/         # Shared utilities
```

## Database Schema

The system uses 10 tables: User, Category, MenuItem, MenuItemOption, Cart, CartItem, Order, OrderItem, Payment, OrderStatusLog.

Key design decisions:
- **Atomic stock deduction**: Orders use Prisma transactions with conditional updates to prevent overselling
- **Stale price protection**: Checkout validates current prices against cart prices, returns 409 on mismatch
- **Status state machine**: Order status transitions are validated (no backward transitions)
- **Audit trail**: OrderStatusLog tracks all status changes with timestamps

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|-------|
| DATABASE_URL | PostgreSQL connection string | — |
| JWT_SECRET | JWT signing secret | — |
| JWT_EXPIRATION | Token expiry duration | 24h |
| PORT | Server port | 3001 |
