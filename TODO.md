steps to run the project

1. run the docker compose file - docker compose up
2. run the prisma generate - pnpm prisma generate
3. run the prisma db push - pnpm prisma db push
4. run the prisma seed - pnpm run db:seed
5. run the nextjs app - pnpm run dev


TODO:
1. add user to group request, only admin can add/remove someone to any group.
    model GroupRequest {
     id          String             @id @default(cuid())
     userId      String
     groupName   String             @db.VarChar(128)
     reason      String             @db.Text
     status      GroupRequestStatus @default(PENDING)
     requestedAt DateTime           @default(now())
     processedAt DateTime?
     processedBy String?
     comments    String?            @db.Text
     user        PortalUser         @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@index([userId])
     @@index([status])
     @@index([requestedAt])
     @@map("group_requests")
   }
    enum GroupRequestStatus {
      PENDING
      APPROVED
      REJECTED
    }

2. ✅ failed login history
    model FailedLogin {
     id                  String      @id @default(cuid())
     email               String      @db.VarChar(255)
     reason              String      @db.VarChar(255)
     ipAddress           String?     @db.VarChar(45)
     userAgent           String?     @db.Text
     attemptCount        Int         @default(1)
     consecutiveFailures Int         @default(1)
     timestamp           DateTime    @default(now())
     portalUser          PortalUser? @relation(fields: [portalUserId], references: [id])
     portalUserId        String?

     @@index([email])
     @@index([ipAddress])
     @@index([timestamp])
     @@map("failed_logins")
   }
3. ✅ all audit logs
   implement these in audit logs db
    model AuditLog {
     id        String     @id @default(cuid())
     userId    String
     action    String     @db.VarChar(255)
     resource  String?    @db.VarChar(255)
     details   String?    @db.Text
     ipAddress String?    @db.VarChar(45)
     userAgent String?    @db.Text
     createdAt DateTime   @default(now())
     user      PortalUser @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@index([userId])
     @@index([action])
     @@index([createdAt])
     @@map("audit_logs")
    }

4. 