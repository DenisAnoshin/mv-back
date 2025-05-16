import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

import { Message } from '../messages/messages.entity';
import { UsersGroups } from '../users_groups/users_groups.entity'; 

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  
  @OneToMany(() => Message, (msg) => msg.sender)
  sentMessages: Message[];

  @OneToMany(() => UsersGroups, (userGroup) => userGroup.group)
  usersGroups: UsersGroups[]; 
}
