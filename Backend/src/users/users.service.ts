import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';

type UpdateUserDto = {
  name?: string;
  email?: string;
};

type CreateUserData = {
  name: string;
  email: string;
  password: string;
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findById(userId).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            ...(updateUserDto.name !== undefined && { name: updateUserDto.name }),
            ...(updateUserDto.email !== undefined && { email: updateUserDto.email }),
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(userData: CreateUserData) {
    return this.userModel.create(userData);
  }
}
