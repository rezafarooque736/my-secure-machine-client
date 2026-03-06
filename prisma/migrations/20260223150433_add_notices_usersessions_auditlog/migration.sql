-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT,
    "clientIp" TEXT,
    "serverIp" TEXT,
    "hostname" TEXT,
    "userAgent" TEXT,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutTime" TIMESTAMP(3),
    "durationMin" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoutReason" TEXT,
    "metadata" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_sessions_username_idx" ON "user_sessions"("username");

-- CreateIndex
CREATE INDEX "user_sessions_loginTime_idx" ON "user_sessions"("loginTime");

-- CreateIndex
CREATE INDEX "user_sessions_isActive_idx" ON "user_sessions"("isActive");

-- CreateIndex
CREATE INDEX "user_sessions_clientIp_idx" ON "user_sessions"("clientIp");

-- CreateIndex
CREATE INDEX "notices_isActive_idx" ON "notices"("isActive");

-- CreateIndex
CREATE INDEX "notices_isPinned_idx" ON "notices"("isPinned");

-- CreateIndex
CREATE INDEX "notices_createdAt_idx" ON "notices"("createdAt");
