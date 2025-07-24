import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoginAtToUser1750413442751 implements MigrationInterface {
    name = 'AddLoginAtToUser1750413442751';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'loginAt') THEN
                ALTER TABLE "user" ADD COLUMN "loginAt" TIMESTAMP;
            END IF;
        END
        $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "loginAt"`);
    }
} 