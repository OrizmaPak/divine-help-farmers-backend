-- CreateTable
CREATE TABLE "Roles" (
    "role" STRING NOT NULL,
    "permissions" STRING,
    "description" STRING,
    "status" STRING NOT NULL DEFAULT 'ACTIVE'
);

-- CreateIndex
CREATE UNIQUE INDEX "Roles_role_key" ON "Roles"("role");
