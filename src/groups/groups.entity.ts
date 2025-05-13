import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    ManyToOne,
  } from 'typeorm';
  import { UsersGroups } from '../users_groups/users_groups.entity';
  import { Message } from '../messages/messages.entity';
import { User } from 'src/users/users.entity';
  
  @Entity()
  export class Group {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    name: string;
  
    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { eager: true, nullable: false })
    admin: User;
  
    @OneToMany(() => UsersGroups, (ug) => ug.group)
    usersGroups: UsersGroups[];
  
    @OneToMany(() => Message, (msg) => msg.group)
    messages: Message[];
  }
  