"use client";

import { useRouter } from "next/navigation";

export default function UsersDropdown({ users, selectedId }) {
  const router = useRouter();

  return (
    <label className="flex w-full max-w-md flex-col gap-1" htmlFor="users">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Users
      </span>
      <select
        id="users"
        name="users"
        value={selectedId}
        disabled={!users.length}
        onChange={(event) => {
          router.replace(
            `/permissions?user=${encodeURIComponent(event.target.value)}`,
          );
        }}
        className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
      >
        {users.length ? (
          users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))
        ) : (
          <option value="">No users.</option>
        )}
      </select>
    </label>
  );
}
