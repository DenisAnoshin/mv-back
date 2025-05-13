import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    Unique,
    JoinColumn,
  } from 'typeorm';
  import { User } from '../users/users.entity';
  import { Group } from '../groups/groups.entity';
  
  @Entity()
  @Unique(['user', 'group'])
  export class UsersGroups {
    @PrimaryGeneratedColumn()
    id: number;
  
    @ManyToOne(() => User, (user) => user.usersGroups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @ManyToOne(() => Group, (group) => group.usersGroups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'groupId' })
    group: Group;
  }
  