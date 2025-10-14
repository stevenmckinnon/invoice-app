# useSession Hook - Available Fields

The `useSession` hook now returns the following user fields:

## Available Fields

```typescript
{
  data: {
    user: {
      id: string;              // User ID
      email: string;           // User email
      firstName?: string;      // First name
      lastName?: string;       // Last name
      fullName?: string;       // Full name (firstName + lastName)
      name?: string;           // Legacy field (same as fullName)
    }
  }
}
```

## Usage Examples

### Basic Usage
```tsx
"use client";
import { useSession } from "next-auth/react";

export function UserProfile() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div>
      <h1>Welcome, {session.user.fullName}!</h1>
      <p>Email: {session.user.email}</p>
      <p>First Name: {session.user.firstName}</p>
      <p>Last Name: {session.user.lastName}</p>
    </div>
  );
}
```

### Display Full Name or Email
```tsx
const displayName = session.user.fullName || session.user.email;
```

### Conditional Rendering
```tsx
{session.user.firstName && (
  <p>Hi, {session.user.firstName}!</p>
)}
```

### TypeScript Support
All fields are fully typed with TypeScript autocomplete support!

```tsx
// TypeScript knows about all fields
const user = session.user;
user.firstName // ✅ string | undefined
user.lastName  // ✅ string | undefined
user.fullName  // ✅ string | undefined
user.email     // ✅ string
user.id        // ✅ string
```

## Field Values

- **firstName**: User's first name from sign-up
- **lastName**: User's last name from sign-up
- **fullName**: Combination of `firstName + lastName`, or email if names not provided
- **name**: Same as fullName (for backward compatibility)
- **email**: User's email address
- **id**: Unique user ID

## Example: Personalized Greeting

```tsx
export function Greeting() {
  const { data: session } = useSession();

  if (!session?.user) return <p>Please sign in</p>;

  const greeting = session.user.firstName
    ? `Hi, ${session.user.firstName}!`
    : `Welcome, ${session.user.email}!`;

  return <h2>{greeting}</h2>;
}
```

## Example: User Profile Card

```tsx
export function ProfileCard() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const { firstName, lastName, email, fullName } = session.user;

  return (
    <div className="profile-card">
      <h3>{fullName}</h3>
      <div>
        <label>First Name:</label>
        <span>{firstName || 'Not provided'}</span>
      </div>
      <div>
        <label>Last Name:</label>
        <span>{lastName || 'Not provided'}</span>
      </div>
      <div>
        <label>Email:</label>
        <span>{email}</span>
      </div>
    </div>
  );
}
```

