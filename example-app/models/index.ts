import { db } from "@example-app/db/db-client.js"

import { Comment } from "@example-app/models/comment.js"
import { Thread } from "@example-app/models/thread.js"
import { User } from "@example-app/models/user.js"

db.addModels([User, Thread, Comment])

export { db, Comment, Thread, User }
