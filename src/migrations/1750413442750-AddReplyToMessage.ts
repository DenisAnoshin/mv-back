import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplyToMessage1750413442750 implements MigrationInterface {
    name = 'AddReplyToMessage1750413442750'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "authorId"`);

        await queryRunner.query(`ALTER TABLE "message" ADD "text" character varying`);
        await queryRunner.query(`ALTER TABLE "message" ADD "ai" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "message" ADD "aiAnswer" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "message" ADD "senderId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD "groupId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD "replyToId" integer`);

        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_a85a728f01be8f15f0e52019389" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_dc84d76f927b87f616cbedcf2e5" FOREIGN KEY ("replyToId") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_dc84d76f927b87f616cbedcf2e5"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_a85a728f01be8f15f0e52019389"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_bc096b4e18b1f9508197cd98066"`);

        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "replyToId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "groupId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "aiAnswer"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "ai"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "text"`);

        await queryRunner.query(`ALTER TABLE "message" ADD "authorId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD "content" text NOT NULL`);
    }
}
