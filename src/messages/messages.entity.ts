import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
  } from 'typeorm';
  import { User } from '../users/users.entity';
  import { Group } from '../groups/groups.entity';
import { UsersGroups } from 'src/users_groups/users_groups.entity';
  
  @Entity()
  export class Message {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ nullable: true })
    text: string;

    @Column({ default: false })
    ai: boolean;

    @Column({ default: false })
    aiAnswer: boolean;
  
    @ManyToOne(() => User, (user) => user.sentMessages, { nullable: true })
    sender: User;
  
    @ManyToOne(() => Group, (group) => group.messages, { nullable: true })
    group: Group;
  
    @CreateDateColumn()
    createdAt: Date;
    message: { id: number; username: string; sentMessages: Message[]; receivedMessages: Message[]; usersGroups: UsersGroups[]; };
  }
  