import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { Article, UpsertArticleInput } from '../shared/types';

export interface ArticleListResult {
  articles: Article[];
  categories: string[];
}

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'KB', init);
}

export const listArticles = (base: string, search = ''): Promise<ArticleListResult> =>
  request<ArticleListResult>(base, `/api/kb/articles${search ? `?search=${encodeURIComponent(search)}` : ''}`);

export const createArticle = (base: string, input: UpsertArticleInput): Promise<Article> =>
  request<{ article: Article }>(base, '/api/kb/articles', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.article);

export const updateArticle = (base: string, id: number, input: UpsertArticleInput): Promise<Article> =>
  request<{ article: Article }>(base, `/api/kb/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((r) => r.article);

export const deleteArticle = (base: string, id: number): Promise<void> =>
  request(base, `/api/kb/articles/${id}`, { method: 'DELETE' }).then(() => undefined);
