import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplyToMessage1750413442750 implements MigrationInterface {
    name = 'AddReplyToMessage1750413442750'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users_groups" ("id" SERIAL NOT NULL, "userId" integer, "groupId" integer, CONSTRAINT "UQ_1a46100a0a80ac423f183f07f0c" UNIQUE ("userId", "groupId"), CONSTRAINT "PK_4644edf515e3c0b88e988522588" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "adminId" integer NOT NULL, CONSTRAINT "PK_256aa0fda9b1de1a73ee0b7106b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "authorId"`);
        await queryRunner.query(`ALTER TABLE "message" ADD "text" character varying`);
        await queryRunner.query(`ALTER TABLE "message" ADD "ai" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "message" ADD "aiAnswer" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "message" ADD "senderId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD "groupId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD "replyToId" integer`);
        await queryRunner.query(`ALTER TABLE "users_groups" ADD CONSTRAINT "FK_682de41e20f223092c7353974b7" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users_groups" ADD CONSTRAINT "FK_71c149feea5a44f7ff77a10d463" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group" ADD CONSTRAINT "FK_30893a67ca8c8f5e709b5bd5720" FOREIGN KEY ("adminId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_a85a728f01be8f15f0e52019389" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_dc84d76f927b87f616cbedcf2e5" FOREIGN KEY ("replyToId") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_dc84d76f927b87f616cbedcf2e5"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_a85a728f01be8f15f0e52019389"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_bc096b4e18b1f9508197cd98066"`);
        await queryRunner.query(`ALTER TABLE "group" DROP CONSTRAINT "FK_30893a67ca8c8f5e709b5bd5720"`);
        await queryRunner.query(`ALTER TABLE "users_groups" DROP CONSTRAINT "FK_71c149feea5a44f7ff77a10d463"`);
        await queryRunner.query(`ALTER TABLE "users_groups" DROP CONSTRAINT "FK_682de41e20f223092c7353974b7"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "replyToId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "groupId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "aiAnswer"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "ai"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "text"`);
        await queryRunner.query(`ALTER TABLE "message" ADD "authorId" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD "content" text NOT NULL`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "group"`);
        await queryRunner.query(`DROP TABLE "users_groups"`);
    }

}
