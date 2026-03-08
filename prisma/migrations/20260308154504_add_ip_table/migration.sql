-- CreateTable
CREATE TABLE "guacamole_user_available_ip" (
    "id" SERIAL NOT NULL,
    "ip" VARCHAR(256) NOT NULL,
    "group_name" VARCHAR(128) NOT NULL,
    "gateway" VARCHAR(256),
    "user_id" INTEGER,
    "username" VARCHAR(128),
    "start_date" TIMESTAMP(0),
    "is_available_user" INTEGER NOT NULL DEFAULT 0,
    "connection_id" INTEGER,
    "container_name" VARCHAR(128),

    CONSTRAINT "guacamole_user_available_ip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_guacamole_user_available_ip_user_id" ON "guacamole_user_available_ip"("user_id");

-- CreateIndex
CREATE INDEX "idx_guacamole_user_available_ip_group_name" ON "guacamole_user_available_ip"("group_name");

-- CreateIndex
CREATE INDEX "idx_guacamole_user_available_ip_ip" ON "guacamole_user_available_ip"("ip");
