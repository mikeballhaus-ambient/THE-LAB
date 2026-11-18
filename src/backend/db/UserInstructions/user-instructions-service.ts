import { userInstructionsRepository } from './user-instructions-repository';
import { UserInstruction } from '../../../shared/types';

export class UserInstructionsService {
  private static instance: UserInstructionsService | null = null

  private constructor() {}

  public static getInstance(): UserInstructionsService {
    if (!UserInstructionsService.instance) {
      UserInstructionsService.instance = new UserInstructionsService();
    }
    return UserInstructionsService.instance;
  }

  //
  // QUERY METHODS
  //


  getUserInstructionsForUser(userId: number): UserInstruction | undefined {
    return userInstructionsRepository.getUserInstructionsForUser(userId);
  }

  //
  // CRUD OPERATIONS
  //

  insertUserInstructionsForUser(userId: number, text: string): void {
    userInstructionsRepository.insertUserInstructionsForUser(userId, text);
  }


  updateUserInstructionsForUser(userId: number, text: string): void {
    userInstructionsRepository.updateUserInstructionsForUser(userId, text);
  }


  deleteUserInstructionsForUser(userId: number): void {
    userInstructionsRepository.deleteUserInstructionsForUser(userId);
  }


  getAllUserInstructions(): UserInstruction[] {
    return userInstructionsRepository.getAllUserInstructions();
  }

    ensureUserHasDefaultUserInstructions(userId: number): void {
      userInstructionsRepository.ensureUserHasDefaultUserInstructions(userId);
    }
}

// Singleton instance
export const userInstructionsService = UserInstructionsService.getInstance();
export default userInstructionsService;
