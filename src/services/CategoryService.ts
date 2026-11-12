import * as Crypto from 'expo-crypto';
import { Category } from '../models/Category';
import { CategoryRepository } from '../repositories/CategoryRepository';

export class CategoryService {
  private readonly categoryRepository: CategoryRepository;

  public constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  public async createCategory(
    userId: string,
    name: string,
    color: string | null
  ): Promise<Category> {
    const category = new Category({
      id: Crypto.randomUUID(),
      userId,
      name,
      color,
    });

    await this.categoryRepository.create(category);
    return category;
  }

  public async updateCategory(
    id: string,
    userId: string,
    name: string,
    color: string | null
  ): Promise<Category> {
    const existing = await this.categoryRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Categoria não encontrada para este usuário.');
    }

    existing.updateDetails(name, color);
    await this.categoryRepository.update(existing);
    return existing;
  }

  public async listCategoriesByUser(userId: string): Promise<Category[]> {
    return this.categoryRepository.findAllByUser(userId);
  }
}
