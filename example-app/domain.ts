export type User = {
  id: string
  canManageTasks: boolean
}

export type Task = {
  id: number
  ownerId: string
  title: string
  status: "open" | "done"
  visibility: "private" | "public"
}

export type TaskAttributes = Pick<Task, "title" | "status" | "visibility">

export const users: Record<string, User> = {
  alice: { id: "alice", canManageTasks: true },
  bob: { id: "bob", canManageTasks: false },
}

export const tasks: Task[] = [
  { id: 1, ownerId: "alice", title: "Review access", status: "open", visibility: "private" },
  { id: 2, ownerId: "bob", title: "Publish guide", status: "done", visibility: "public" },
  { id: 3, ownerId: "bob", title: "Plan release", status: "open", visibility: "private" },
]

export function resetTasks(): void {
  tasks.splice(
    0,
    tasks.length,
    { id: 1, ownerId: "alice", title: "Review access", status: "open", visibility: "private" },
    { id: 2, ownerId: "bob", title: "Publish guide", status: "done", visibility: "public" },
    { id: 3, ownerId: "bob", title: "Plan release", status: "open", visibility: "private" }
  )
}
