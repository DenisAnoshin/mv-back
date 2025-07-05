import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplyToMessage1750413442750 implements MigrationInterface {
    name = 'AddReplyToMessage1750413442750';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'text') THEN
                ALTER TABLE "message" ADD COLUMN "text" character varying;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'ai') THEN
                ALTER TABLE "message" ADD COLUMN "ai" boolean NOT NULL DEFAULT false;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'aiAnswer') THEN
                ALTER TABLE "message" ADD COLUMN "aiAnswer" boolean NOT NULL DEFAULT false;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'senderId') THEN
                ALTER TABLE "message" ADD COLUMN "senderId" integer;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'groupId') THEN
                ALTER TABLE "message" ADD COLUMN "groupId" integer;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'replyToId') THEN
                ALTER TABLE "message" ADD COLUMN "replyToId" integer;
            END IF;
        END
        $$;`);

        // Добавление внешних ключей — только если их ещё нет
        await queryRunner.query(`DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'FK_bc096b4e18b1f9508197cd98066'
            ) THEN
                ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'FK_a85a728f01be8f15f0e52019389'
            ) THEN
                ALTER TABLE "message" ADD CONSTRAINT "FK_a85a728f01be8f15f0e52019389" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'FK_dc84d76f927b87f616cbedcf2e5'
            ) THEN
                ALTER TABLE "message" ADD CONSTRAINT "FK_dc84d76f927b87f616cbedcf2e5" FOREIGN KEY ("replyToId") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
            END IF;
        END
        $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем только если существует
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_dc84d76f927b87f616cbedcf2e5"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_a85a728f01be8f15f0e52019389"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_bc096b4e18b1f9508197cd98066"`);

        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "replyToId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "groupId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "aiAnswer"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "ai"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "text"`);

        await queryRunner.query(`ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "authorId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "content" text NOT NULL`);
    }
}
